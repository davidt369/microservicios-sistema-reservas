

/*
ROLAP - Relational OLAP
Consulta directa al Data Warehouse sin agregación previa.
✅ Ventajas: Tiempo real, sin duplicación de datos
❌ Desventajas: Más lento con grandes volúmenes
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
    SELECT
        tiempo_sk,
        fecha,
        anio,
        mes,
        nombre_mes,
        trimestre
    FROM "neondb"."public"."dim_tiempo"
),

dim_paciente_clean AS (
    SELECT
        paciente_sk,
        sexo,
        edad,
        grupo_etario,
        departamento,
        municipio
    FROM "neondb"."public"."dim_paciente"
),

dim_diagnostico_clean AS (
    SELECT
        diagnostico_sk,
        codigo_cie10,
        diagnostico,
        grupo_enfermedad,
        tipo,
        es_transmisible,
        es_cronico
    FROM "neondb"."public"."dim_diagnostico"
),

dim_sucursal_clean AS (
    SELECT
        sucursal_sk,
        nombre_hospital
    FROM "neondb"."public"."dim_sucursal"
)

-- Consulta ROLAP: SIN agregación, cada fila es una atención
SELECT
    t.anio,
    t.mes,
    t.nombre_mes,
    t.trimestre,
    t.fecha,
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
    
    -- Medidas a nivel de atención individual
    f.atencion_sk,
    f.cantidad_diagnosticos,
    f.dias_internacion,
    f.costo_total_bs,
    CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END as reingreso,
    
    -- Timestamp para medir frescura de datos
    CURRENT_TIMESTAMP as consulta_timestamp,
    'ROLAP' as tipo_olap

FROM fact_base f
INNER JOIN dim_tiempo_clean t ON f.tiempo_sk = t.tiempo_sk
INNER JOIN dim_paciente_clean p ON f.paciente_sk = p.paciente_sk
INNER JOIN dim_diagnostico_clean d ON f.diagnostico_principal_sk = d.diagnostico_sk
INNER JOIN dim_sucursal_clean s ON f.sucursal_sk = s.sucursal_sk