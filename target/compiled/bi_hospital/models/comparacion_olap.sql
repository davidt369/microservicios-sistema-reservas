

/*
📊 ANÁLISIS COMPARATIVO: ROLAP vs MOLAP vs HOLAP

Este modelo genera métricas de comparación entre las tres implementaciones.
Ejecuta consultas idénticas en cada estrategia para medir:
- Volumen de datos retornados
- Nivel de agregación
- Frescura de datos

Para medir performance real, ejecuta en Lightdash:
lightdash sql --query "SELECT * FROM rolap_casos_epidemiologicos WHERE anio = 2025 LIMIT 1000"
lightdash sql --query "SELECT * FROM molap_cubo_epidemiologico WHERE anio = 2025"
*/

WITH rolap_stats AS (
    SELECT
        'ROLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(DISTINCT atencion_sk) as granularidad_registros,
        MIN(consulta_timestamp) as timestamp_datos,
        'DETALLE' as nivel_agregacion,
        'Vista en tiempo real' as implementacion
    FROM "neondb"."public_rolap"."rolap_casos_epidemiologicos"
),

molap_stats AS (
    SELECT
        'MOLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(DISTINCT CONCAT_WS('|', anio, mes, departamento, grupo_enfermedad)) as granularidad_registros,
        MIN(cubo_build_timestamp) as timestamp_datos,
        'AGREGADO' as nivel_agregacion,
        'Tabla materializada' as implementacion
    FROM "neondb"."public_molap"."molap_cubo_epidemiologico"
),

holap_stats AS (
    SELECT
        'HOLAP' as estrategia,
        COUNT(*) as filas_totales,
        COUNT(CASE WHEN nivel_detalle = 'AGREGADO' THEN 1 END) as filas_agregadas,
        COUNT(CASE WHEN nivel_detalle = 'DETALLE' THEN 1 END) as filas_detalladas,
        MIN(data_timestamp) as timestamp_datos,
        'HIBRIDO' as nivel_agregacion,
        'Vista UNION ALL' as implementacion
    FROM "neondb"."public_holap"."holap_epidemiologia_hibrida"
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

ORDER BY estrategia