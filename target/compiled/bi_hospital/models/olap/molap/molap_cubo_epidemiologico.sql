

/*
MOLAP - Multidimensional OLAP
Cubo precalculado con agregaciones en todas las combinaciones dimensionales.
✅ Ventajas: Consultas ultra-rápidas, drill-down inmediato
❌ Desventajas: Ocupa más espacio, requiere actualización periódica
*/

WITH fact_base AS (
    SELECT
        f.atencion_sk,
        f.tiempo_sk,
        f.paciente_sk,
        f.diagnostico_principal_sk,
        f.sucursal_sk,
        f.cantidad_diagnosticos,
        f.dias_internacion,
        f.reingreso_30d,
        f.costo_total_bs
    FROM "neondb"."public"."fact_atenciones" f
),

dim_tiempo_clean AS (
    SELECT tiempo_sk, fecha, anio, mes, nombre_mes, trimestre
    FROM "neondb"."public"."dim_tiempo"
),

dim_paciente_clean AS (
    SELECT paciente_sk, sexo, edad, grupo_etario, departamento, municipio
    FROM "neondb"."public"."dim_paciente"
),

dim_diagnostico_clean AS (
    SELECT diagnostico_sk, codigo_cie10, diagnostico, grupo_enfermedad, tipo, es_transmisible, es_cronico
    FROM "neondb"."public"."dim_diagnostico"
),

dim_sucursal_clean AS (
    SELECT sucursal_sk, nombre_hospital
    FROM "neondb"."public"."dim_sucursal"
)

-- Cubo MOLAP: Agregaciones precalculadas en TODAS las dimensiones
SELECT
    t.anio,
    t.mes,
    t.nombre_mes,
    t.trimestre,
    p.departamento,
    p.municipio,
    p.grupo_etario,
    p.sexo,
    d.grupo_enfermedad,
    d.codigo_cie10,
    d.diagnostico,
    d.es_transmisible,
    d.es_cronico,
    s.nombre_hospital,
    
    -- MEDIDAS AGREGADAS (pre-calculadas)
    COUNT(*) as total_casos,
    COUNT(DISTINCT f.paciente_sk) as pacientes_unicos,
    SUM(f.cantidad_diagnosticos) as total_diagnosticos,
    SUM(f.dias_internacion) as total_dias_internacion,
    AVG(f.dias_internacion) as promedio_dias_internacion,
    SUM(CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END) as total_reingresos,
    SUM(f.costo_total_bs) as costo_total,
    AVG(f.costo_total_bs) as costo_promedio,
    
    -- Incidencia por 100,000 habitantes (placeholder)
    (COUNT(*) * 100000.0 / NULLIF(COUNT(DISTINCT f.paciente_sk), 0)) as tasa_incidencia_por_100k,
    
    -- Porcentajes precalculados
    (SUM(CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100) as porcentaje_reingreso,
    
    -- Timestamp de construcción del cubo
    CURRENT_TIMESTAMP as cubo_build_timestamp,
    'MOLAP' as tipo_olap

FROM fact_base f
INNER JOIN dim_tiempo_clean t ON f.tiempo_sk = t.tiempo_sk
INNER JOIN dim_paciente_clean p ON f.paciente_sk = p.paciente_sk
INNER JOIN dim_diagnostico_clean d ON f.diagnostico_principal_sk = d.diagnostico_sk
INNER JOIN dim_sucursal_clean s ON f.sucursal_sk = s.sucursal_sk

GROUP BY
    t.anio,
    t.mes,
    t.nombre_mes,
    t.trimestre,
    p.departamento,
    p.municipio,
    p.grupo_etario,
    p.sexo,
    d.grupo_enfermedad,
    d.codigo_cie10,
    d.diagnostico,
    d.es_transmisible,
    d.es_cronico,
    s.nombre_hospital