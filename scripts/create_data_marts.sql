-- ============================================
-- DATA MARTS - SISTEMA BI CLÍNICO
-- Vistas especializadas desde Data Warehouse
-- PostgreSQL
-- ============================================

-- ============================================
-- DATA MART EPIDEMIOLÓGICO
-- Análisis de enfermedades y salud pública
-- ============================================
CREATE OR REPLACE VIEW dm_epidemiologico AS
SELECT
    -- Dimensión Tiempo
    t.tiempo_sk,
    t.fecha,
    t.anio,
    t.mes,
    t.nombre_mes,
    t.trimestre,
    t.dia,
    t.nombre_dia,
    t.es_fin_semana,
    
    -- Dimensión Paciente (geografía y demografía)
    p.paciente_sk,
    p.sexo,
    p.edad,
    p.grupo_etario,
    p.departamento,
    p.provincia,
    p.municipio,
    p.zona,
    
    -- Dimensión Diagnóstico
    d.diagnostico_sk,
    d.codigo_cie10,
    d.diagnostico,
    d.categoria_cie10,
    d.grupo_enfermedad,
    d.tipo AS severidad,
    d.es_transmisible,
    d.es_cronico,
    
    -- Dimensión Sucursal
    s.sucursal_sk,
    s.nombre_hospital,
    s.ubicacion,
    s.sistema_clinico,
    
    -- Medidas
    f.atencion_sk,
    f.cantidad_diagnosticos,
    f.dias_internacion,
    f.reingreso_30d,
    f.diagnosticos_json,
    
    -- Métricas calculadas
    CASE WHEN f.reingreso_30d THEN 1 ELSE 0 END AS casos_reingreso,
    1 AS total_casos
    
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk;

COMMENT ON VIEW dm_epidemiologico IS 'Data Mart para análisis epidemiológico: casos, distribución geográfica, patologías';


-- ============================================
-- DATA MART FINANCIERO
-- Análisis de costos y facturación
-- ============================================
CREATE OR REPLACE VIEW dm_financiero AS
SELECT
    -- Dimensión Tiempo
    t.tiempo_sk,
    t.fecha,
    t.anio,
    t.mes,
    t.nombre_mes,
    t.trimestre,
    
    -- Dimensión Servicio
    sv.servicio_sk,
    sv.servicio,
    sv.tipo_servicio,
    sv.area,
    sv.nivel,
    
    -- Dimensión Sucursal
    s.sucursal_sk,
    s.nombre_hospital,
    s.ubicacion,
    
    -- Dimensión Personal
    pm.personal_sk,
    pm.nombre_completo AS medico,
    pm.especialidad,
    pm.cargo,
    
    -- Dimensión Paciente (para segmentación)
    p.grupo_etario,
    p.departamento,
    
    -- Medidas financieras
    f.atencion_sk,
    f.costo_total_bs,
    f.costo_medicamentos_bs,
    f.costo_servicio_bs,
    f.cantidad_medicamentos,
    f.dias_internacion,
    
    -- Métricas calculadas
    1 AS total_atenciones,
    f.costo_total_bs / NULLIF(f.dias_internacion, 0) AS costo_por_dia,
    f.costo_medicamentos_bs / NULLIF(f.cantidad_medicamentos, 0) AS costo_promedio_medicamento
    
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_servicio sv ON f.servicio_sk = sv.servicio_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
JOIN dim_personal_medico pm ON f.personal_sk = pm.personal_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk;

COMMENT ON VIEW dm_financiero IS 'Data Mart financiero: costos, facturación, análisis económico';


-- ============================================
-- DATA MART PRODUCTIVIDAD MÉDICA
-- Análisis de rendimiento del personal
-- ============================================
CREATE OR REPLACE VIEW dm_productividad_medica AS
SELECT
    -- Dimensión Personal Médico
    pm.personal_sk,
    pm.personal_id_origen,
    pm.nombre_completo,
    pm.especialidad,
    pm.cargo,
    pm.nivel_atencion,
    pm.anos_experiencia,
    
    -- Dimensión Tiempo
    t.tiempo_sk,
    t.fecha,
    t.anio,
    t.mes,
    t.nombre_mes,
    t.es_fin_semana,
    
    -- Dimensión Servicio
    sv.servicio_sk,
    sv.servicio,
    sv.tipo_servicio,
    sv.area,
    
    -- Dimensión Sucursal
    s.sucursal_sk,
    s.nombre_hospital,
    
    -- Dimensión Paciente (para análisis de complejidad)
    p.paciente_sk,
    p.grupo_etario,
    
    -- Dimensión Diagnóstico (complejidad)
    d.diagnostico_sk,
    d.grupo_enfermedad,
    d.es_cronico,
    
    -- Medidas de productividad
    f.atencion_sk,
    f.dias_internacion,
    f.costo_total_bs AS ingreso_generado,
    f.cantidad_diagnosticos,
    f.estado,
    
    -- Métricas calculadas
    1 AS total_atenciones,
    CASE WHEN f.dias_internacion > 0 THEN 1 ELSE 0 END AS atenciones_con_internacion,
    CASE WHEN d.es_cronico THEN 1 ELSE 0 END AS atenciones_cronicos
    
FROM fact_atenciones f
JOIN dim_personal_medico pm ON f.personal_sk = pm.personal_sk
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_servicio sv ON f.servicio_sk = sv.servicio_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk;

COMMENT ON VIEW dm_productividad_medica IS 'Data Mart productividad: atenciones, rendimiento médico, carga laboral';


-- ============================================
-- DATA MART FARMACIA
-- Análisis de medicamentos y prescripción
-- ============================================
CREATE OR REPLACE VIEW dm_farmacia AS
SELECT
    -- Dimensión Tiempo
    t.tiempo_sk,
    t.fecha,
    t.anio,
    t.mes,
    t.nombre_mes,
    
    -- Dimensión Medicamento
    m.medicamento_sk,
    m.codigo_atc,
    m.medicamento,
    m.principio_activo,
    m.grupo_farmacologico,
    m.forma_farmaceutica,
    m.via_administracion,
    
    -- Dimensión Diagnóstico (para análisis de prescripción)
    d.diagnostico_sk,
    d.codigo_cie10,
    d.diagnostico,
    d.grupo_enfermedad,
    
    -- Dimensión Sucursal
    s.sucursal_sk,
    s.nombre_hospital,
    
    -- Dimensión Personal (prescriptor)
    pm.personal_sk,
    pm.nombre_completo AS prescriptor,
    pm.especialidad,
    
    -- Medidas farmacéuticas
    f.atencion_sk,
    f.cantidad_medicamentos,
    f.costo_medicamentos_bs,
    f.medicamentos_json,
    
    -- Métricas calculadas
    1 AS total_prescripciones,
    f.costo_medicamentos_bs / NULLIF(f.cantidad_medicamentos, 0) AS costo_promedio_unitario
    
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_medicamento m ON f.medicamento_principal_sk = m.medicamento_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
JOIN dim_personal_medico pm ON f.personal_sk = pm.personal_sk
WHERE f.medicamento_principal_sk IS NOT NULL;

COMMENT ON VIEW dm_farmacia IS 'Data Mart farmacia: medicamentos, prescripción, costos farmacéuticos';


-- ============================================
-- VISTAS AGREGADAS (KPIs RÁPIDOS)
-- ============================================

-- KPI: Resumen epidemiológico mensual
CREATE OR REPLACE VIEW kpi_epidemiologico_mensual AS
SELECT
    anio,
    mes,
    nombre_mes,
    departamento,
    municipio,
    grupo_enfermedad,
    COUNT(*) AS total_casos,
    SUM(casos_reingreso) AS total_reingresos,
    AVG(dias_internacion) AS promedio_dias_internacion,
    COUNT(DISTINCT paciente_sk) AS pacientes_unicos,
    ROUND(100.0 * SUM(casos_reingreso) / COUNT(*), 2) AS tasa_reingreso_pct
FROM dm_epidemiologico
GROUP BY anio, mes, nombre_mes, departamento, municipio, grupo_enfermedad;

COMMENT ON VIEW kpi_epidemiologico_mensual IS 'KPIs epidemiológicos agregados mensualmente';


-- KPI: Resumen financiero mensual
CREATE OR REPLACE VIEW kpi_financiero_mensual AS
SELECT
    anio,
    mes,
    nombre_mes,
    nombre_hospital,
    servicio,
    especialidad,
    COUNT(*) AS total_atenciones,
    SUM(costo_total_bs) AS costo_total,
    SUM(costo_medicamentos_bs) AS costo_medicamentos,
    SUM(costo_servicio_bs) AS costo_servicios,
    AVG(costo_total_bs) AS costo_promedio_atencion,
    SUM(dias_internacion) AS total_dias_internacion
FROM dm_financiero
GROUP BY anio, mes, nombre_mes, nombre_hospital, servicio, especialidad;

COMMENT ON VIEW kpi_financiero_mensual IS 'KPIs financieros agregados mensualmente';


-- KPI: Productividad médica mensual
CREATE OR REPLACE VIEW kpi_productividad_mensual AS
SELECT
    anio,
    mes,
    personal_sk,
    nombre_completo,
    especialidad,
    nombre_hospital,
    COUNT(*) AS total_atenciones,
    COUNT(DISTINCT paciente_sk) AS pacientes_unicos,
    SUM(dias_internacion) AS total_dias_internacion,
    SUM(ingreso_generado) AS total_ingreso_generado,
    AVG(cantidad_diagnosticos) AS promedio_diagnosticos_por_atencion,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT fecha), 2) AS atenciones_por_dia_trabajado
FROM dm_productividad_medica
GROUP BY anio, mes, personal_sk, nombre_completo, especialidad, nombre_hospital;

COMMENT ON VIEW kpi_productividad_mensual IS 'KPIs de productividad médica mensual';


-- KPI: Uso de medicamentos mensual
CREATE OR REPLACE VIEW kpi_farmacia_mensual AS
SELECT
    anio,
    mes,
    nombre_mes,
    grupo_farmacologico,
    medicamento,
    nombre_hospital,
    COUNT(*) AS total_prescripciones,
    SUM(cantidad_medicamentos) AS unidades_prescritas,
    SUM(costo_medicamentos_bs) AS costo_total_medicamentos,
    AVG(costo_promedio_unitario) AS costo_promedio_por_unidad,
    COUNT(DISTINCT diagnostico_sk) AS diagnosticos_distintos_tratados
FROM dm_farmacia
GROUP BY anio, mes, nombre_mes, grupo_farmacologico, medicamento, nombre_hospital;

COMMENT ON VIEW kpi_farmacia_mensual IS 'KPIs de uso de medicamentos mensual';


-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- (Solo si las vistas se materializan)
-- ============================================

/*
-- Si decides materializar las vistas para mayor velocidad:

CREATE MATERIALIZED VIEW dm_epidemiologico_mat AS
SELECT * FROM dm_epidemiologico;

CREATE INDEX idx_epi_mat_tiempo ON dm_epidemiologico_mat(anio, mes);
CREATE INDEX idx_epi_mat_geo ON dm_epidemiologico_mat(departamento, municipio);
CREATE INDEX idx_epi_mat_enfermedad ON dm_epidemiologico_mat(grupo_enfermedad);

-- Actualización nocturna
REFRESH MATERIALIZED VIEW dm_epidemiologico_mat;
*/


-- ============================================
-- GRANT PERMISSIONS (ajustar según usuarios)
-- ============================================

-- Usuarios BI pueden leer los Data Marts
-- GRANT SELECT ON dm_epidemiologico TO bi_usuario;
-- GRANT SELECT ON dm_financiero TO bi_usuario;
-- GRANT SELECT ON dm_productividad_medica TO bi_usuario;
-- GRANT SELECT ON dm_farmacia TO bi_usuario;

-- Solo administración puede ver datos financieros detallados
-- GRANT SELECT ON dm_financiero TO admin_financiero;


-- ============================================
-- FIN DATA MARTS
-- ============================================
