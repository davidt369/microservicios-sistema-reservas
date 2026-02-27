# 📊 Arquitectura BI Clínico - Data Warehouse, Data Marts y OLAP

**Proyecto:** Sistema de Reservas - Data Warehouse Clínico Multi-Hospital  
**Fecha:** Febrero 2026  
**Autor:** Grupo de Desarrollo BI

---

## 1. 🎯 Ubicación Actual en la Arquitectura BI

### Flujo Completo de Inteligencia de Negocios

```
┌─────────────────────────────────────────────────────────────┐
│  OLTP (Hospitales)                                          │
│  ├─ Grupo 1 (Supabase)                                      │
│  ├─ Grupo 2 (Otras BD)                                      │
│  └─ Grupo N...                                              │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  ETL (Extracción, Transformación, Carga)                    │
│  ├─ etl_processor.js                                        │
│  ├─ Mapeo de esquemas heterogéneos                          │
│  ├─ Transformaciones de negocio                             │
│  └─ Claves sustitutas (SKs)                                 │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  DATA WAREHOUSE (Modelo Estrella) ✅ [ESTÁS AQUÍ]          │
│  ├─ dim_tiempo                                              │
│  ├─ dim_sucursal                                            │
│  ├─ dim_paciente                                            │
│  ├─ dim_personal_medico                                     │
│  ├─ dim_servicio                                            │
│  ├─ dim_diagnostico                                         │
│  ├─ dim_medicamento                                         │
│  └─ fact_atenciones (Tabla de Hechos)                       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  DATA MARTS (Especializados por área) 🎯 [PRÓXIMO PASO]   │
│  ├─ DM_Epidemiológico                                       │
│  ├─ DM_Financiero                                           │
│  ├─ DM_Productividad_Médica                                 │
│  └─ DM_Farmacia                                             │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  OLAP (Análisis Multidimensional)                           │
│  ├─ ROLAP (consultas SQL al DW)                             │
│  ├─ MOLAP (cubos preagregados)                              │
│  └─ HOLAP (híbrido)                                         │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN                                       │
│  ├─ Dashboards (Power BI, Tableau)                          │
│  ├─ Reportes ejecutivos                                     │
│  ├─ KPIs en tiempo real                                     │
│  └─ Análisis ad-hoc                                         │
└─────────────────────────────────────────────────────────────┘
```

**Estado Actual:** ✅ DW implementado con 50,000+ registros de Grupo 1

---

## 2. 🧱 ¿Qué es un Data Mart?

### Definición

Un **Data Mart** es un subconjunto especializado del Data Warehouse enfocado en un área de negocio específica.

### Características en el Proyecto

- **Origen:** Extraído de `fact_atenciones` + dimensiones relevantes
- **Propósito:** Análisis específico por departamento/área
- **Ventajas:**
  - Consultas más rápidas (menos datos)
  - Modelo simplificado para usuarios finales
  - Optimizado para cada área

### Analogía Hospitalaria

```
Data Warehouse = Hospital completo con todos los datos
Data Mart = Departamento específico (Epidemiología, Finanzas, etc.)
```

---

## 3. 🏥 Data Marts del Modelo Clínico

### 3.1. 🦠 Data Mart Epidemiológico

**Objetivo:** Análisis de enfermedades, brotes y salud pública

**Dimensiones:**
- `dim_tiempo` (año, mes, trimestre, día)
- `dim_diagnostico` (código CIE-10, grupo enfermedad, tipo)
- `dim_paciente` (municipio, departamento, sexo, edad)
- `dim_sucursal` (hospital origen)

**Medidas:**
- Casos totales
- Reingreso 30 días
- Días internación promedio
- Tasa incidencia por zona

**Vista SQL:**
```sql
CREATE VIEW dm_epidemiologico AS
SELECT
    t.anio,
    t.mes,
    t.trimestre,
    p.departamento,
    p.municipio,
    p.zona,
    p.sexo,
    p.grupo_etario,
    d.codigo_cie10,
    d.diagnostico,
    d.grupo_enfermedad,
    d.tipo,
    d.es_transmisible,
    d.es_cronico,
    s.nombre_hospital,
    COUNT(*) AS total_casos,
    SUM(f.reingreso_30d::int) AS total_reingresos,
    AVG(f.dias_internacion) AS promedio_dias_internacion,
    COUNT(DISTINCT f.paciente_sk) AS pacientes_unicos
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
GROUP BY 
    t.anio, t.mes, t.trimestre,
    p.departamento, p.municipio, p.zona, p.sexo, p.grupo_etario,
    d.codigo_cie10, d.diagnostico, d.grupo_enfermedad, d.tipo, 
    d.es_transmisible, d.es_cronico,
    s.nombre_hospital;
```

**KPIs Clave:**
- Top 10 enfermedades por municipio
- Brotes epidemiológicos (variación mensual > 30%)
- Tasa de reingresos por patología crónica

---

### 3.2. 💰 Data Mart Financiero

**Objetivo:** Análisis de costos, facturación y recursos

**Dimensiones:**
- `dim_tiempo`
- `dim_servicio`
- `dim_sucursal`
- `dim_personal_medico`

**Medidas:**
- Costo total (Bs.)
- Costo medicamentos
- Costo servicio
- Ingreso estimado

**Vista SQL:**
```sql
CREATE VIEW dm_financiero AS
SELECT
    t.anio,
    t.mes,
    t.nombre_mes,
    s.servicio,
    s.tipo_servicio,
    s.area,
    s.nivel,
    su.nombre_hospital,
    pm.especialidad,
    COUNT(*) AS total_atenciones,
    SUM(f.costo_total_bs) AS costo_total,
    SUM(f.costo_medicamentos_bs) AS costo_medicamentos,
    SUM(f.costo_servicio_bs) AS costo_servicios,
    AVG(f.costo_total_bs) AS costo_promedio_atencion,
    SUM(f.costo_total_bs) / COUNT(*) AS costo_unitario
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_servicio s ON f.servicio_sk = s.servicio_sk
JOIN dim_sucursal su ON f.sucursal_sk = su.sucursal_sk
JOIN dim_personal_medico pm ON f.personal_sk = pm.personal_sk
GROUP BY 
    t.anio, t.mes, t.nombre_mes,
    s.servicio, s.tipo_servicio, s.area, s.nivel,
    su.nombre_hospital,
    pm.especialidad;
```

**KPIs Clave:**
- Costo promedio por especialidad
- Top servicios más costosos
- Tendencia mensual de gastos

---

### 3.3. 👨‍⚕️ Data Mart Productividad Médica

**Objetivo:** Análisis de rendimiento del personal de salud

**Dimensiones:**
- `dim_personal_medico`
- `dim_servicio`
- `dim_tiempo`
- `dim_sucursal`

**Medidas:**
- Atenciones realizadas
- Días internación generados
- Costo generado
- Productividad (atenciones/día)

**Vista SQL:**
```sql
CREATE VIEW dm_productividad_medica AS
SELECT
    pm.personal_sk,
    pm.nombre_completo,
    pm.especialidad,
    pm.cargo,
    t.anio,
    t.mes,
    s.nombre_hospital,
    COUNT(*) AS total_atenciones,
    COUNT(DISTINCT f.paciente_sk) AS pacientes_unicos,
    SUM(f.dias_internacion) AS total_dias_internacion,
    SUM(f.costo_total_bs) AS ingreso_generado,
    AVG(f.dias_internacion) AS promedio_dias_por_atencion,
    COUNT(*) / COUNT(DISTINCT t.fecha) AS atenciones_por_dia
FROM fact_atenciones f
JOIN dim_personal_medico pm ON f.personal_sk = pm.personal_sk
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
GROUP BY 
    pm.personal_sk, pm.nombre_completo, pm.especialidad, pm.cargo,
    t.anio, t.mes,
    s.nombre_hospital;
```

**KPIs Clave:**
- Médicos con mayor productividad
- Distribución de carga por especialidad
- Comparación entre sucursales

---

### 3.4. 💊 Data Mart Farmacia

**Objetivo:** Análisis de medicamentos y prescripción

**Dimensiones:**
- `dim_medicamento`
- `dim_diagnostico`
- `dim_tiempo`
- `dim_sucursal`

**Medidas:**
- Medicamentos prescritos
- Costo medicamentos
- Frecuencia por diagnóstico

**Vista SQL:**
```sql
CREATE VIEW dm_farmacia AS
SELECT
    t.anio,
    t.mes,
    m.medicamento,
    m.principio_activo,
    m.grupo_farmacologico,
    d.diagnostico,
    d.grupo_enfermedad,
    s.nombre_hospital,
    COUNT(*) AS total_prescripciones,
    SUM(f.costo_medicamentos_bs) AS costo_total_medicamentos,
    AVG(f.cantidad_medicamentos) AS promedio_medicamentos_por_atencion
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_medicamento m ON f.medicamento_principal_sk = m.medicamento_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_sucursal s ON f.sucursal_sk = s.sucursal_sk
WHERE f.medicamento_principal_sk IS NOT NULL
GROUP BY 
    t.anio, t.mes,
    m.medicamento, m.principio_activo, m.grupo_farmacologico,
    d.diagnostico, d.grupo_enfermedad,
    s.nombre_hospital;
```

---

## 4. 🧊 OLAP: ROLAP vs MOLAP vs HOLAP

### Definición General

**OLAP** (Online Analytical Processing) = Tecnología para análisis multidimensional rápido.

---

### 4.1. 🟦 ROLAP (Relational OLAP)

**Concepto:** Las consultas OLAP se ejecutan **directamente sobre el DW relacional** (PostgreSQL).

**Características:**
- ✅ No duplica datos
- ✅ Tiempo real
- ✅ Flexible
- ❌ Más lento con millones de registros

**Ejemplo Práctico:**
```sql
-- Casos por año y enfermedad (ROLAP)
SELECT
    t.anio,
    d.grupo_enfermedad,
    COUNT(*) AS total_casos
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
GROUP BY t.anio, d.grupo_enfermedad
ORDER BY t.anio, total_casos DESC;
```

**Herramientas:**
- Power BI (DirectQuery)
- Tableau (Live)
- Metabase
- Apache Superset

---

### 4.2. 🟧 MOLAP (Multidimensional OLAP)

**Concepto:** Los datos se **preagrega** en cubos físicos optimizados para consulta rápida.

**Características:**
- ✅ Ultra rápido
- ✅ Ideal para dashboards
- ❌ Duplica datos
- ❌ No es tiempo real
- ❌ ETL adicional

**Ejemplo Práctico:**
```sql
-- Crear cubo MOLAP epidemiológico anual
CREATE TABLE cubo_epi_anual AS
SELECT
    t.anio,
    p.departamento,
    p.municipio,
    d.grupo_enfermedad,
    COUNT(*) AS total_casos,
    SUM(f.reingreso_30d::int) AS total_reingresos,
    AVG(f.dias_internacion) AS promedio_dias
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
GROUP BY t.anio, p.departamento, p.municipio, d.grupo_enfermedad;

-- Índices para velocidad
CREATE INDEX idx_cubo_epi_anio ON cubo_epi_anual(anio);
CREATE INDEX idx_cubo_epi_depto ON cubo_epi_anual(departamento);

-- Dashboard consulta el cubo (súper rápido)
SELECT * FROM cubo_epi_anual 
WHERE anio = 2024 AND departamento = 'La Paz';
```

**Herramientas:**
- Microsoft SSAS (SQL Server Analysis Services)
- Mondrian / Pentaho
- Oracle OLAP
- SAP BW

---

### 4.3. 🟩 HOLAP (Hybrid OLAP)

**Concepto:** Combina ROLAP + MOLAP.

**Lógica:**
- **Agregados** → Cubo MOLAP (rápido)
- **Detalle** → DW relacional (drill-down)

**Ejemplo Práctico:**
```sql
-- Dashboard: usa cubo MOLAP
SELECT * FROM cubo_epi_anual 
WHERE anio = 2024 AND grupo_enfermedad = 'Respiratorio';

-- Usuario hace drill-down: consulta DW (ROLAP)
SELECT 
    p.ci,
    p.nombre_completo,
    t.fecha,
    d.diagnostico,
    f.dias_internacion
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
WHERE t.anio = 2024 
  AND d.grupo_enfermedad = 'Respiratorio'
  AND p.departamento = 'La Paz';
```

---

## 5. 📊 Comparación Directa en Hospital

| Escenario | Mejor Opción | Razón |
|-----------|-------------|-------|
| Enfermedades por municipio en tiempo real | **ROLAP** | Datos cambian constantemente |
| Dashboard epidemiológico nacional | **MOLAP** | Millones de casos, consultas repetitivas |
| BI ministerio de salud | **HOLAP** | Dashboard rápido + drill-down detallado |
| Hospital individual (< 100k atenciones/año) | **ROLAP** | Suficiente velocidad, sin complejidad |
| Red hospitalaria grande (> 1M atenciones/año) | **HOLAP** | Balance velocidad/detalle |
| Indicadores mensuales fijos (KPIs) | **MOLAP** | Cálculos complejos preagregados |

---

## 6. 🧪 Ejemplo Completo: Casos por Año y Enfermedad

### Opción 1: ROLAP (Recomendado para tu DW actual)

```sql
-- Consulta directa al DW
SELECT
    t.anio,
    d.grupo_enfermedad,
    p.departamento,
    COUNT(*) AS total_casos,
    SUM(f.reingreso_30d::int) AS reingresos,
    AVG(f.dias_internacion) AS promedio_dias
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
GROUP BY t.anio, d.grupo_enfermedad, p.departamento
ORDER BY t.anio, total_casos DESC;
```

### Opción 2: MOLAP (Para dashboards ejecutivos)

```sql
-- Paso 1: Crear cubo mensual
CREATE TABLE cubo_epi_mensual AS
SELECT
    t.anio,
    t.mes,
    t.nombre_mes,
    p.departamento,
    p.municipio,
    d.grupo_enfermedad,
    COUNT(*) AS total_casos,
    SUM(f.reingreso_30d::int) AS total_reingresos,
    SUM(f.dias_internacion) AS total_dias,
    AVG(f.dias_internacion) AS promedio_dias
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
GROUP BY 
    t.anio, t.mes, t.nombre_mes,
    p.departamento, p.municipio,
    d.grupo_enfermedad;

-- Paso 2: Índices
CREATE INDEX idx_cubo_mes_anio ON cubo_epi_mensual(anio, mes);
CREATE INDEX idx_cubo_mes_depto ON cubo_epi_mensual(departamento);
CREATE INDEX idx_cubo_mes_enf ON cubo_epi_mensual(grupo_enfermedad);

-- Paso 3: Dashboard consulta el cubo (milisegundos)
SELECT 
    anio,
    nombre_mes,
    grupo_enfermedad,
    SUM(total_casos) AS casos
FROM cubo_epi_mensual
WHERE anio = 2024 AND departamento = 'Cochabamba'
GROUP BY anio, nombre_mes, grupo_enfermedad
ORDER BY anio, mes;
```

### Opción 3: HOLAP (Híbrido)

```sql
-- Dashboard ejecutivo: cubo MOLAP
SELECT * FROM cubo_epi_mensual 
WHERE anio = 2024 AND grupo_enfermedad = 'Cardiovascular';

-- Drill-down a paciente: DW completo (ROLAP)
SELECT 
    p.ci,
    p.nombre_completo,
    p.edad,
    t.fecha,
    d.diagnostico,
    f.dias_internacion,
    f.costo_total_bs
FROM fact_atenciones f
JOIN dim_tiempo t ON f.tiempo_sk = t.tiempo_sk
JOIN dim_paciente p ON f.paciente_sk = p.paciente_sk
JOIN dim_diagnostico d ON f.diagnostico_principal_sk = d.diagnostico_sk
WHERE t.anio = 2024 
  AND d.grupo_enfermedad = 'Cardiovascular'
  AND p.departamento = 'Cochabamba';
```

---

## 7. 🧭 Manual Paso a Paso: Implementación BI

### FASE 1 — Data Warehouse ✅ [COMPLETADO]

**Estado:** ✅ Implementado

**Elementos:**
- Modelo estrella clínico
- 7 dimensiones + 1 tabla de hechos
- ETL automatizado con `etl_processor.js`
- 50,000+ atenciones del Grupo 1

**Documentación:**
- Granularidad: 1 atención médica
- Hecho principal: `fact_atenciones`
- Claves sustitutas (SKs) con sufijo de sucursal

---

### FASE 2 — Data Marts 🎯 [SIGUIENTE PASO]

**Acción:** Crear vistas SQL para cada Data Mart

**Script de implementación:**
```bash
# Ejecutar script de creación
psql $DW_CONNECTION -f scripts/create_data_marts.sql
```

**Archivo: `scripts/create_data_marts.sql`**
```sql
-- Data Mart Epidemiológico
CREATE OR REPLACE VIEW dm_epidemiologico AS
SELECT ...;

-- Data Mart Financiero
CREATE OR REPLACE VIEW dm_financiero AS
SELECT ...;

-- Data Mart Productividad
CREATE OR REPLACE VIEW dm_productividad_medica AS
SELECT ...;

-- Data Mart Farmacia
CREATE OR REPLACE VIEW dm_farmacia AS
SELECT ...;
```

---

### FASE 3 — OLAP (Opcional según volumen)

#### Opción A: ROLAP (Recomendado para < 1M registros)

**Configuración Power BI:**
1. Conectar a PostgreSQL
2. Modo: **DirectQuery**
3. Importar vistas Data Mart
4. Crear relaciones automáticas

**Ventajas:**
- Sin ETL adicional
- Datos siempre frescos
- Mantenimiento mínimo

---

#### Opción B: MOLAP (Para dashboards ejecutivos)

**Script de cubos:**
```sql
-- Cubo epidemiológico mensual
CREATE TABLE cubo_epi_mensual AS ...;

-- Cubo financiero anual
CREATE TABLE cubo_financiero_anual AS ...;

-- Job de actualización nocturna
CREATE OR REPLACE FUNCTION refresh_cubos()
RETURNS void AS $$
BEGIN
    TRUNCATE cubo_epi_mensual;
    INSERT INTO cubo_epi_mensual SELECT * FROM dm_epidemiologico;
    
    TRUNCATE cubo_financiero_anual;
    INSERT INTO cubo_financiero_anual SELECT * FROM dm_financiero;
END;
$$ LANGUAGE plpgsql;

-- Programar con cron o pg_cron
SELECT cron.schedule('refresh-cubos', '0 2 * * *', 'SELECT refresh_cubos()');
```

---

### FASE 4 — Dashboards y KPIs

**Estructura recomendada:**

```
📊 Dashboard Epidemiológico
├─ KPI: Casos del mes
├─ Gráfico: Top 10 enfermedades
├─ Mapa: Casos por municipio
└─ Tabla: Detalle por zona

💰 Dashboard Financiero
├─ KPI: Costo total mes
├─ Gráfico: Tendencia mensual
├─ Tabla: Top servicios costosos
└─ Comparación por hospital

👨‍⚕️ Dashboard Productividad
├─ KPI: Atenciones por médico
├─ Ranking: Top médicos
├─ Gráfico: Distribución por especialidad
└─ Comparación entre hospitales
```

---

## 8. 🎯 Recomendación Final para el Proyecto

### Arquitectura Ideal

```
┌─────────────────────────────────────────┐
│  Data Warehouse (PostgreSQL)            │
│  - Modelo estrella                      │
│  - 50,000+ atenciones                   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Data Marts (Vistas SQL)                │
│  ├─ dm_epidemiologico                   │
│  ├─ dm_financiero                       │
│  ├─ dm_productividad_medica             │
│  └─ dm_farmacia                         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  OLAP - ROLAP                           │
│  - Power BI DirectQuery                 │
│  - Consultas directas a vistas          │
│  - Tiempo real                          │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  (Opcional) Cubos MOLAP                 │
│  - Solo para KPIs mensuales             │
│  - Actualización nocturna               │
└─────────────────────────────────────────┘
```

### Justificación

**✅ Usar ROLAP porque:**
- Volumen actual manejable (50k registros)
- Simplicidad arquitectónica
- Sin duplicación de datos
- Datos siempre actualizados
- Suficiente velocidad con índices

**✅ Agregar MOLAP solo si:**
- El volumen supera 1M atenciones/año
- Dashboards ejecutivos con KPIs fijos
- Consultas muy complejas (> 5 segundos)

---

## 9. 🚀 Próximos Pasos

### Inmediato (Esta semana)

- [x] DW implementado
- [x] ETL funcional
- [ ] Crear archivo `create_data_marts.sql` con las 4 vistas
- [ ] Validar performance de consultas
- [ ] Documentar KPIs principales

### Corto plazo (2-4 semanas)

- [ ] Conectar Power BI al DW
- [ ] Crear 4 dashboards básicos
- [ ] Definir actualización de datos (¿cada cuánto correr ETL?)
- [ ] Capacitación usuarios finales

### Mediano plazo (1-3 meses)

- [ ] Agregar más hospitales (Grupo 2, 3, etc.)
- [ ] Optimizar índices si hay lentitud
- [ ] Evaluar necesidad de cubos MOLAP
- [ ] Implementar alertas automáticas (ej: brotes)

---

## 10. 📚 Glosario

| Término | Definición |
|---------|-----------|
| **DW** | Data Warehouse - Almacén central de datos históricos |
| **Data Mart** | Subconjunto del DW enfocado en un área de negocio |
| **OLAP** | Online Analytical Processing - Análisis multidimensional |
| **ROLAP** | Relational OLAP - OLAP sobre base de datos relacional |
| **MOLAP** | Multidimensional OLAP - OLAP con cubos preagregados |
| **HOLAP** | Hybrid OLAP - Combinación de ROLAP y MOLAP |
| **SK** | Surrogate Key - Clave sustituta |
| **Granularidad** | Nivel de detalle más bajo en el DW |
| **Drill-down** | Navegar de resumen a detalle |
| **Slice/Dice** | Filtrar y cortar datos en un cubo |

---

## 11. 📖 Referencias

- **Esquema DW:** `db_star.sql`
- **ETL:** `script/etl_processor.js`
- **Configuración:** `script/etl_processor.js` (líneas 1-80)
- **Arquitectura completa:** Este documento

---

**Documento creado:** Febrero 2026  
**Última actualización:** Febrero 2026  
**Versión:** 1.0
