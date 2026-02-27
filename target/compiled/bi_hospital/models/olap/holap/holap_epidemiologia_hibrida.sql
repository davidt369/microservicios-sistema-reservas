

/*
HOLAP - Hybrid OLAP
Combina MOLAP para consultas agregadas rápidas y ROLAP para drill-down detallado.
✅ Ventajas: Balance perfecto entre velocidad y flexibilidad
❌ Desventajas: Complejidad de gestión
*/

-- CAPA AGREGADA (MOLAP) - Para dashboards rápidos
WITH cubo_molap AS (
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
        'AGREGADO' as nivel_detalle,
        cubo_build_timestamp as data_timestamp
    FROM "neondb"."public_molap"."molap_cubo_epidemiologico"
),

-- CAPA DETALLADA (ROLAP) - Para drill-down bajo demanda
detalle_rolap AS (
    SELECT
        anio,
        mes,
        departamento,
        grupo_enfermedad,
        atencion_sk,
        codigo_cie10,
        diagnostico,
        costo_total_bs as costo_individual,
        'DETALLE' as nivel_detalle,
        consulta_timestamp as data_timestamp
    FROM "neondb"."public_rolap"."rolap_casos_epidemiologicos"
)

-- Vista HOLAP unificada - Permite cambiar entre niveles
SELECT
    anio,
    mes,
    departamento,
    grupo_enfermedad,
    
    -- Campos del cubo MOLAP (NULL cuando es detalle)
    total_casos,
    pacientes_unicos,
    costo_total,
    costo_promedio,
    porcentaje_reingreso,
    
    -- Campos del ROLAP (NULL cuando es agregado)
    atencion_sk,
    codigo_cie10,
    diagnostico,
    costo_individual,
    
    -- Metadatos
    nivel_detalle,
    data_timestamp,
    'HOLAP' as tipo_olap

FROM cubo_molap

UNION ALL

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
    costo_individual,
    nivel_detalle,
    data_timestamp,
    'HOLAP' as tipo_olap
FROM detalle_rolap