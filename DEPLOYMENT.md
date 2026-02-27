# 🚀 Guía Completa de Despliegue - ROLAP vs MOLAP vs HOLAP

## 📑 Índice
1. [Pre-requisitos](#pre-requisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Paso 1: Cargar Datos ETL](#paso-1-cargar-datos-etl)
4. [Paso 2: Desplegar OLAP](#paso-2-desplegar-olap)
5. [Paso 3: Ejecutar Benchmarks](#paso-3-ejecutar-benchmarks)
6. [Paso 4: Desplegar en Lightdash](#paso-4-desplegar-en-lightdash)
7. [Validación y Testing](#validación-y-testing)
8. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

### ✅ Checklist de Requisitos

- [ ] Ubuntu 24.04 LTS o similar
- [ ] Node.js v18+ instalado
- [ ] PostgreSQL client (`psql`) instalado
- [ ] Python 3.8+ instalado
- [ ] Acceso a Supabase (OLTP)
- [ ] Acceso a Neon (Data Warehouse)
- [ ] Acceso a Lightdash (BI Tool)
- [ ] Git instalado

### Verificar Instalaciones

```bash
node --version          # Debe mostrar v18+
psql --version          # Debe mostrar psql 16+
python3 --version       # Debe mostrar 3.8+
git --version           # Debe mostrar 2.0+
npm --version           # Debe mostrar 8.0+
```

### Instalar Dependencias Faltantes (Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y \
  postgresql-client \
  python3 \
  python3-pip \
  nodejs \
  npm \
  git

# Instalar cliente Python para PostgreSQL
pip3 install psycopg2-binary
```

---

## Configuración Inicial

### 1. Clonar Repositorio

```bash
git clone https://github.com/davidt369/microservicios-sistema-reservas.git
cd microservicios-sistema-reservas
```

### 2. Instalar Dependencias Node.js

```bash
npm install

# Verificar instalación
npm list  # Debe mostrar las dependencias sin errores
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# Editar con tus credenciales
nano .env  # o tu editor favorito

# Credenciales necesarias:
# - OLTP_HOST, OLTP_USER, OLTP_PASSWORD
# - DW_HOST, DW_USER, DW_PASSWORD (ya seteadas)
# - LIGHTDASH_TOKEN (ya seteado)
```

### 4. Verificar Conexiones

```bash
# Probar conexión OLTP (Supabase)
PGPASSWORD='tu_password' psql \
  -h aws-0-us-west-2.pooler.supabase.com \
  -U usuario1.fgzrkjkflenmdmyfnkpr \
  -d postgres \
  -c "SELECT COUNT(*) FROM pacientes;"

# Probar conexión DW (Neon)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner \
  -d neondb \
  -c "SELECT COUNT(*) FROM fact_atenciones;"

# Ambas deben retornar un número sin errores
```

---

## Paso 1: Cargar Datos ETL

### Flujo de Datos
```
OLTP (Supabase)           Data Warehouse (Neon)
  ├─ pacientes           ├─ fact_atenciones
  ├─ personal            ├─ dim_paciente
  ├─ atenciones          ├─ dim_personal
  └─ diagnosticos        ├─ dim_tiempo
                         ├─ dim_diagnostico
                         ├─ dim_sucursal
                         └─ dim_servicio
```

### Ejecutar ETL

```bash
# Comando principal
node script/etl_processor.js

# Salida esperada:
# 🔄 Ejecutando ETL desde Grupo 1...
# ✅ Cargados 50,000 pacientes
# ✅ Cargados 50,000 personal
# ✅ Cargados 50,000 atenciones
# ✅ Cargados 15 diagnósticos únicos
# ✅ ETL completado en 2.5 minutos
```

### Validar Datos Cargados

```bash
# Contar registros en cada tabla
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "
    SELECT 'fact_atenciones' as tabla, COUNT(*) FROM fact_atenciones
    UNION ALL
    SELECT 'dim_paciente', COUNT(*) FROM dim_paciente
    UNION ALL
    SELECT 'dim_personal', COUNT(*) FROM dim_personal
    UNION ALL
    SELECT 'dim_diagnostico', COUNT(*) FROM dim_diagnostico
    UNION ALL
    SELECT 'dim_tiempo', COUNT(*) FROM dim_tiempo
  "

# Resultado esperado:
# tabla              | count
# ───────────────────┼───────
# fact_atenciones    | 50000
# dim_paciente       | 50000
# dim_personal       | 50000
# dim_diagnostico    |    15
# dim_tiempo         |  3650
```

---

## Paso 2: Desplegar OLAP

Este paso crea 3 modelos OLAP diferentes con diferentes características de rendimiento.

### Arquitectura de Modelos

```
                     DEPLIEGUE OLAP
                          │
                ┌──────────┼──────────┐
                │          │          │
               ROLAP      MOLAP      HOLAP
             (VIEW)      (TABLE)     (VIEW)
               │          │          │
          Tiempo real  Precalc.   Híbrido
          Sin storage  43 MB      43 MB
          300-500ms    50-100ms   50-500ms
          Flexible     Rápido     Balanceado
```

### Ejecutar Despliegue

```bash
# OPCIÓN 1: Script lite (recomendado para plan gratuito)
# Crea ROLAP, MOLAP (reducido), HOLAP y vista de comparación
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -p 5432 < script/deploy_molap_lite.sql

# Salida esperada:
# ✅ Vista ROLAP creada: rolap_casos_epidemiologicos
# ✅ Tabla MOLAP creada (versión lite): molap_cubo_epidemiologico
# ✅ Vista HOLAP recreada: holap_epidemiologia_hibrida
# ✅ Vista de comparación recreada: comparacion_olap
```

```bash
# OPCIÓN 2: Script completo (requiere plan PRO de Neon)
# Intenta crear MOLAP con todas las dimensiones (~500MB)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -p 5432 < script/deploy_olap_models.sql

# ⚠️ Puede fallar con: "project size limit exceeded"
```

### Validar Despliegue

```bash
# Verificar que las vistas existen
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "
    \d rolap_casos_epidemiologicos
    \d molap_cubo_epidemiologico
    \d holap_epidemiologia_hibrida
  "

# Contar filas en cada modelo
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "
    SELECT 'ROLAP (detalle)' as modelo, COUNT(*) as filas 
    FROM rolap_casos_epidemiologicos
    UNION ALL
    SELECT 'MOLAP (agregado)', COUNT(*) 
    FROM molap_cubo_epidemiologico
    UNION ALL
    SELECT 'HOLAP (híbrido)', COUNT(*) 
    FROM holap_epidemiologia_hibrida
  "

# Resultado esperado:
# modelo             | filas
# ──────────────────┼────────
# ROLAP (detalle)   | 50000
# MOLAP (agregado)  | 54423
# HOLAP (híbrido)   |104423
```

---

## Paso 3: Ejecutar Benchmarks

### ¿Qué mide el benchmark?

- **Tiempo de ejecución** de la misma consulta en ROLAP vs MOLAP
- **Volumen de datos** retornados
- **Velocidad relativa** (MOLAP speedup vs ROLAP)
- **Comparación de estrategias** OLAP

### Ejecutar Benchmark Completo

```bash
# Script Python que ejecuta benchmarks automáticamente
python3 script/benchmark_olap.py

# Salida esperada (10-30 segundos):
```

```
════════════════════════════════════════════════════════════════════════════════
🔬 BENCHMARK ROLAP vs MOLAP vs HOLAP
════════════════════════════════════════════════════════════════════════════════
Inicio: 2026-02-27 10:30:45

✅ Conexión establecida a Neon PostgreSQL

────────────────────────────────────────────────────────────────────────────────
📊 Test: COUNT_TOTAL
────────────────────────────────────────────────────────────────────────────────

⏱️  Ejecutando rolap... ✅ 245.30 ms (1 filas)
⏱️  Ejecutando molap... ✅ 48.15 ms (1 filas)
⏱️  Ejecutando holap_agregado... ✅ 52.40 ms (1 filas)
⏱️  Ejecutando holap_detalle... ✅ 238.90 ms (1 filas)

🚀 MOLAP es 5.09x más rápido que ROLAP

────────────────────────────────────────────────────────────────────────────────
📊 Test: TOP_10_DEPARTAMENTOS
────────────────────────────────────────────────────────────────────────────────

⏱️  Ejecutando rolap... ✅ 342.50 ms (10 filas)
⏱️  Ejecutando molap... ✅ 67.30 ms (10 filas)

🚀 MOLAP es 5.08x más rápido que ROLAP

────────────────────────────────────────────────────────────────────────────────
📊 Test: CASOS_POR_ENFERMEDAD
────────────────────────────────────────────────────────────────────────────────

⏱️  Ejecutando rolap... ✅ 423.80 ms (20 filas)
⏱️  Ejecutando molap... ✅ 85.20 ms (20 filas)

🚀 MOLAP es 4.97x más rápido que ROLAP

════════════════════════════════════════════════════════════════════════════════
📈 RESUMEN DE RENDIMIENTO
════════════════════════════════════════════════════════════════════════════════

count_total:
  rolap             :   245.30 ms
  molap             :    48.15 ms
  holap_agregado    :    52.40 ms
  holap_detalle     :   238.90 ms

top_10_departamentos:
  rolap             :   342.50 ms
  molap             :    67.30 ms

casos_por_enfermedad:
  rolap             :   423.80 ms
  molap             :    85.20 ms

════════════════════════════════════════════════════════════════════════════════
📊 COMPARACIÓN DE ESTRATEGIAS OLAP
════════════════════════════════════════════════════════════════════════════════

Estrategia   Filas        Nivel          Implementación
────────────────────────────────────────────────────────────
HOLAP        104423       HIBRIDO        Vista UNION ALL
MOLAP        54423        AGREGADO       Tabla materializada (lite)
ROLAP        50000        DETALLE        Vista en tiempo real

✅ Benchmark completado: 2026-02-27 10:31:02
════════════════════════════════════════════════════════════════════════════════
```

### Interpretar Resultados

| Métrica | Insight |
|---------|---------|
| **MOLAP 5x más rápido** | MOLAP ideal para dashboards ejecutivos |
| **ROLAP 300-400ms** | Aceptable para análisis, no para dashboards |
| **HOLAP híbrido** | Dashboard rápido (MOLAP) + drill-down flexible (ROLAP) |

---

## Paso 4: Desplegar en Lightdash

### Instalar Lightdash CLI

```bash
npm install -g @lightdash/cli

# Verificar instalación
lightdash --version  # Debe mostrar v0.xxx+
```

### Autenticarse con Lightdash

```bash
lightdash login https://app.lightdash.cloud \
  --token ldpat_0f41a27c36d4eed5235af44c71e88f5a

# Salida esperada:
# ✅️ Login successful!
# Now you can add your first project by doing:
# ⚡️ lightdash deploy --create
```

### Desplegar Proyecto

⚠️ **IMPORTANTE**: El flag `--project-name` no existe en Lightdash CLI.

```bash
# ✅ CORRECTO (SIN --project-name)
cd /workspaces/microservicios-sistema-reservas
lightdash deploy --create

# Responder los prompts interactivos:
# ? What is the name of your new project?
# → BI Hospital - Comparación OLAP
# ? Enable scheduler?
# → No

# Salida esperada:
# ✅ Validating dbt project...
# ✅ Compiling models: 4 models
# ✅ Creating project...
# 🔗 Access at: https://app.lightdash.cloud/projects/xxx/dashboards
```

**Referencia**: [LIGHTDASH_DEPLOY_FIX.md](docs/LIGHTDASH_DEPLOY_FIX.md) - Solución a errores comunes

### Crear Dashboards en Lightdash

#### Dashboard 1: Comparación de Estrategias OLAP

```
1. Crear dashboard → Nuevo
2. Agregar tabla: "comparacion_olap"
3. Columnas a mostrar:
   - estrategia
   - filas_totales
   - bytes_estimados
   - nivel_agregacion
   - implementacion
4. Guardar como "OLAP Strategies Comparison"
```

#### Dashboard 2: Top Diagnósticos (MOLAP)

```
1. Crear dashboard → Nuevo
2. Agregar visualización: Gráfico de barras
3. Fuente: "molap_cubo_epidemiologico"
4. Eje X: "grupo_enfermedad"
5. Eje Y: SUM("total_casos")
6. Filtros:
   - anio = 2025
7. Ordenar por total_casos DESC
8. Top 10
9. Guardar como "Top Diagnósticos (MOLAP)"
```

#### Dashboard 3: Drill-Down Interactivo (HOLAP)

```
1. Crear dashboard → Nuevo
2. Agregar tabla: "holap_epidemiologia_hibrida"
3. Filtrar: nivel_detalle = 'AGREGADO'
4. Columnas:
   - anio, mes, departamento, grupo_enfermedad
   - total_casos, costo_total, porcentaje_reingreso
5. Agregar detalle drill-down:
   - Clic en fila → filtra a nivel_detalle='DETALLE'
   - Mostrar: atencion_sk, codigo_cie10, diagnostico, costo_individual
6. Guardar como "Epidemiología Drill-Down (HOLAP)"
```

### Acceder a Dashboards

```
https://app.lightdash.cloud/projects/<project-id>/dashboards
```

---

## Validación y Testing

### ✅ Checklist de Validación

```bash
# 1. Verificar ETL
node script/etl_processor.js

[ ] Tabla fact_atenciones: 50,000 registros
[ ] Tabla dim_paciente: 50,000 registros
[ ] Tabla dim_diagnostico: 15+ registros
[ ] Tabla dim_tiempo: 3,650 registros

# 2. Verificar OLAP
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM rolap_casos_epidemiologicos;"

[ ] ROLAP view: 50,000 filas
[ ] MOLAP table: 54,423 filas
[ ] HOLAP view: 104,423 filas

# 3. Ejecutar benchmark
python3 script/benchmark_olap.py

[ ] MOLAP 5x+ más rápido que ROLAP
[ ] Todas las consultas sin errores

# 4. Lightdash
lightdash deploy

[ ] Proyecto desplegado exitosamente
[ ] 4 modelos compilados
[ ] Dashboards accesibles en Lightdash Cloud
```

### Queries de Validación Rápida

```sql
-- Validar ROLAP
SELECT COUNT(*) FROM rolap_casos_epidemiologicos;  -- 50,000

-- Validar MOLAP
SELECT COUNT(*) FROM molap_cubo_epidemiologico;    -- 54,423

-- Validar HOLAP
SELECT 
  nivel_detalle, 
  COUNT(*) as filas
FROM holap_epidemiologia_hibrida
GROUP BY nivel_detalle;
-- AGREGADO: 54,423
-- DETALLE: 50,000

-- Ver comparación
SELECT * FROM comparacion_olap;
```

---

## Troubleshooting

### ❌ Error: "password authentication failed"

**Causa**: Contraseña incorrecta en .env  
**Solución**:
```bash
# 1. Verificar variable
echo $DW_PASSWORD

# 2. Verificar en .env
cat .env | grep DW_PASSWORD

# 3. Probar conexión directa
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb -c "\dt"
```

### ❌ Error: "project size limit exceeded"

**Causa**: Plan gratuito Neon = 512MB  
**Solución**:
```bash
# Usar script lite (43MB)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  < script/deploy_molap_lite.sql

# O cambiar a plan Neon Pro ($19/mes)
```

### ❌ Error: "could not extend file"

**Causa**: MOLAP completo es demasiado grande  
**Solución**: Ya cubierta arriba (usar deploy_molap_lite.sql)

### ❌ Error: "relation does not exist"

**Causa**: OLAP no desplegado  
**Solución**:
```bash
# Desplegar OLAP primero
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  < script/deploy_molap_lite.sql

# Verificar
\d rolap_casos_epidemiologicos
```

### ❌ Error: "Module not found" en ETL

**Causa**: Dependencias Node no instaladas  
**Solución**:
```bash
npm install
npm list  # Verificar
node script/etl_processor.js
```

### ❌ Error: "timeout" en psql

**Causa**: Query muy lenta o conexión inestable  
**Solución**:
```bash
# Aumentar timeout
PGCONNECT_TIMEOUT=30 PGPASSWORD='...' psql \
  -h ... \
  -c "SELECT COUNT(*) FROM molap_cubo_epidemiologico;"

# O usar script con less overhead
PGPASSWORD='...' psql -h ... < script/deploy_molap_lite.sql
```

---

## ✅ Siguiente Pasos

Una vez todo validado:

1. [ ] Cargar 68k diagnósticos (requiere schema update)
2. [ ] Crear Data Marts adicionales
3. [ ] Agregar más dimensiones a MOLAP
4. [ ] Implementar actualización incremental de MOLAP
5. [ ] Automatizar benchmarks diarios
6. [ ] Conectar APIs REST de microservicios

---

## 📞 Contacto y Soporte

- **Documentación**: Ver `/docs`
- **Lightdash Docs**: https://docs.lightdash.com
- **Neon Docs**: https://neon.tech/docs
- **dbt Docs**: https://docs.getdbt.com

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026  
**Autor**: Sistema BI Hospitalario
