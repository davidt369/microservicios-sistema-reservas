-- ================================================
-- MOLAP OPTIMIZADO (versión reducida para 512MB)
-- ================================================
-- Esta versión del cubo MOLAP usa menos dimensiones para caber en el límite de espacio
-- Ejecutar con: PGPASSWORD='npg_jr5fHxYAJU2S' psql -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech -U neondb_owner -d neondb -p 5432 -f deploy_molap_lite.sql

\timing on

DROP TABLE IF EXISTS molap_cubo_epidemiologico CASCADE;

CREATE TABLE molap_cubo_epidemiologico AS
SELECT
    t.anio,
    t.mes,
    t.trimestre,
    p.departamento,
    p.grupo_etario,
    d.grupo_enfermedad,
    d.es_transmisible,
    
    -- MEDIDAS AGREGADAS (pre-calculadas)
    COUNT(*) as total_casos,
    COUNT(DISTINCT f.paciente_sk) as pacientes_unicos,
    SUM(f.cantidad_diagnosticos) as total_diagnosticos,
    SUM(f.dias_internacion) as total_dias_internacion,
    AVG(f.dias_internacion) as promedio_dias_internacion,
    SUM(CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END) as total_reingresos,
    SUM(f.costo_total_bs) as costo_total,
    AVG(f.costo_total_bs) as costo_promedio,
    
    -- Incidencia por 100,000 habitantes
    (COUNT(*) * 100000.0 / NULLIF(COUNT(DISTINCT f.paciente_sk), 0)) as tasa_incidencia_por_100k,
    
    -- Porcentajes precalculados
    (SUM(CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100) as porcentaje_reingreso,
    
    -- Timestamp de construcción del cubo
    CURRENT_TIMESTAMP as cubo_build_timestamp,
    'MOLAP' as tipo_olap

FROM fact_atenciones f
INNER JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
INNER JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
INNER JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk

GROUP BY
    t.anio, t.mes, t.trimestre,
    p.departamento, p.grupo_etario,
    d.grupo_enfermedad, d.es_transmisible;

-- Crear índices para optimizar el cubo MOLAP
CREATE INDEX idx_molap_anio_mes ON molap_cubo_epidemiologico(anio, mes);
CREATE INDEX idx_molap_departamento ON molap_cubo_epidemiologico(departamento);
CREATE INDEX idx_molap_grupo_enfermedad ON molap_cubo_epidemiologico(grupo_enfermedad);

\echo '✅ Tabla MOLAP creada (versión lite): molap_cubo_epidemiologico'
\echo ''

-- Recrear vista HOLAP
DROP VIEW IF EXISTS holap_epidemiologia_hibrida CASCADE;

CREATE VIEW holap_epidemiologia_hibrida AS
-- CAPA AGREGADA (MOLAP)
SELECT
    anio,
    mes,
    departamento,
    grupo_enfermedad,
    total_casos,
    pacientes_unicos,
    costo_total,
    costo_promedio,
    porcentaje_reingreso,
    NULL::INTEGER as atencion_sk,
    NULL::VARCHAR as codigo_cie10,
    NULL::VARCHAR as diagnostico,
    NULL::NUMERIC as costo_individual,
    'AGREGADO' as nivel_detalle,
    cubo_build_timestamp as data_timestamp,
    'HOLAP' as tipo_olap
FROM molap_cubo_epidemiologico

UNION ALL

-- CAPA DETALLADA (ROLAP)
SELECT
    anio,
    mes,
    departamento,
    grupo_enfermedad,
    NULL as total_casos,
    NULL as pacientes_unicos,
    NULL as costo_total,
    NULL as costo_promedio,
    NULL as porcentaje_reingreso,
    atencion_sk,
    codigo_cie10,
    diagnostico,
    costo_total_bs as costo_individual,
    'DETALLE' as nivel_detalle,
    consulta_timestamp as data_timestamp,
    'HOLAP' as tipo_olap
FROM rolap_casos_epidemiologicos;

\echo '✅ Vista HOLAP recreada: holap_epidemiologia_hibrida'
\echo ''

-- Recrear vista de comparación
DROP VIEW IF EXISTS comparacion_olap CASCADE;

CREATE VIEW comparacion_olap AS
WITH rolap_stats AS (
    SELECT
        'ROLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(DISTINCT atencion_sk) as granularidad_registros,
        MIN(consulta_timestamp) as timestamp_datos,
        'DETALLE' as nivel_agregacion,
        'Vista en tiempo real' as implementacion
    FROM rolap_casos_epidemiologicos
),
molap_stats AS (
    SELECT
        'MOLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(DISTINCT CONCAT_WS('|', anio::TEXT, mes::TEXT, departamento, grupo_enfermedad)) as granularidad_registros,
        MIN(cubo_build_timestamp) as timestamp_datos,
        'AGREGADO' as nivel_agregacion,
        'Tabla materializada (lite)' as implementacion
    FROM molap_cubo_epidemiologico
),
holap_stats AS (
    SELECT
        'HOLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(CASE WHEN nivel_detalle = 'AGREGADO' THEN 1 END) as filas_agregadas,
        MIN(data_timestamp) as timestamp_datos,
        'HIBRIDO' as nivel_agregacion,
        'Vista UNION ALL' as implementacion
    FROM holap_epidemiologia_hibrida
)
SELECT
    estrategia,
    filas_totales,
    granularidad_registros,
    timestamp_datos,
    nivel_agregacion,
    implementacion,
    
    -- Estimación de tamaño (bytes)
    filas_totales * 500 as bytes_estimados,
    
    -- Ratio de compresión respecto a ROLAP
    CASE 
        WHEN estrategia = 'ROLAP' THEN 100.0
        ELSE (filas_totales::FLOAT / (SELECT filas_totales FROM rolap_stats) * 100)
    END as porcentaje_tamano_vs_rolap,
    
    -- Frescura de datos
    CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 60 THEN '< 1 minuto'
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 3600 THEN '< 1 hora'
        ELSE '> 1 hora'
    END as frescura_datos

FROM rolap_stats

UNION ALL

SELECT
    estrategia,
    filas_totales,
    granularidad_registros,
    timestamp_datos,
    nivel_agregacion,
    implementacion,
    filas_totales * 800 as bytes_estimados,
    (filas_totales::FLOAT / (SELECT filas_totales FROM rolap_stats) * 100) as porcentaje_tamano_vs_rolap,
    CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 60 THEN '< 1 minuto'
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 3600 THEN '< 1 hora'
        ELSE '> 1 hora'
    END as frescura_datos
FROM molap_stats

UNION ALL

SELECT
    estrategia,
    filas_totales,
    filas_agregadas as granularidad_registros,
    timestamp_datos,
    nivel_agregacion,
    implementacion,
    filas_totales * 600 as bytes_estimados,
    (filas_totales::FLOAT / (SELECT filas_totales FROM rolap_stats) * 100) as porcentaje_tamano_vs_rolap,
    CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 60 THEN '< 1 minuto'
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp_datos)) < 3600 THEN '< 1 hora'
        ELSE '> 1 hora'
    END as frescura_datos
FROM holap_stats

ORDER BY estrategia;

\echo '✅ Vista de comparación recreada: comparacion_olap'
\echo ''
\echo 'Ejecuta para ver estadísticas:'
\echo 'SELECT * FROM comparacion_olap;'
