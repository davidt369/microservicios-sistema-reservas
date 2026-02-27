# 🏥 Sistema BI Hospitalario - Comparación ROLAP vs MOLAP vs HOLAP

## 📋 Descripción General

Este proyecto implementa un **Data Warehouse hospitalario** con comparación práctica de tres estrategias OLAP:

- **ROLAP** (Relational OLAP): Vistas en tiempo real sin materialización
- **MOLAP** (Multidimensional OLAP): Cubos precalculados con agregaciones
- **HOLAP** (Hybrid OLAP): Combinación híbrida para dashboards interactivos

### Arquitectura de Datos
```
OLTP (Grupo 1 - Supabase) 
    ↓
ETL Processor (Node.js)
    ↓
Data Warehouse (Neon PostgreSQL)
    ├─ 7 Dimensiones
    └─ 1 Tabla de Hechos (fact_atenciones)
        ↓
Data Marts / OLAP Models
    ├─ ROLAP (Vista en tiempo real)
    ├─ MOLAP (Tabla agregada)
    └─ HOLAP (Vista híbrida)
        ↓
Lightdash (BI Tool)
    ↓
Dashboards Interactivos
```

---

## 🛠 Requisitos Previos

### Sistema Operativo
- Ubuntu 24.04 LTS (recomendado) o similar Linux
- macOS o Windows WSL2

### Herramientas Requeridas
```bash
# Node.js (para ETL)
node --version  # v18+ recomendado

# PostgreSQL Client (para scripts SQL)
psql --version

# Python 3 (para benchmarks)
python3 --version

# Git (para versionado)
git --version
```

### Instalación de Dependencias
```bash
# En Ubuntu
sudo apt-get update
sudo apt-get install -y postgresql-client python3 python3-pip nodejs npm git

# Instalar dependencias Node.js del proyecto
cd /workspaces/microservicios-sistema-reservas
npm install

# Instalar cliente PostgreSQL Python
pip install psycopg2-binary
```

---

## 🔐 Configuración de Credenciales

### Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Base de Datos OLTP (Supabase - Grupo 1)
OLTP_HOST=aws-0-us-west-2.pooler.supabase.com
OLTP_DATABASE=postgres
OLTP_USER=usuario1.fgzrkjkflenmdmyfnkpr
OLTP_PASSWORD=<tu_password>
OLTP_PORT=5432

# Data Warehouse (Neon PostgreSQL)
DW_HOST=ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech
DW_DATABASE=neondb
DW_USER=neondb_owner
DW_PASSWORD=npg_jr5fHxYAJU2S
DW_PORT=5432

# Lightdash
LIGHTDASH_TOKEN=ldpat_0f41a27c36d4eed5235af44c71e88f5a
LIGHTDASH_URL=https://app.lightdash.cloud
```

---

## 📦 Estructura del Proyecto

```
microservicios-sistema-reservas/
├── README.md                          # Este archivo
├── package.json                       # Dependencias Node.js
├── .env                               # Variables de entorno (NO commitear)
├── .gitignore
│
├── script/                            # Scripts de ETL y despliegue
│   ├── etl_processor.js              # ✅ ETL principal (50k registros)
│   ├── generate_data.js              # Generador de datos de prueba
│   ├── deploy_olap_models.sql        # Despliegue OLAP completo
│   ├── deploy_molap_lite.sql         # ✅ MOLAP versión lite (funciona en 512MB)
│   ├── benchmark_olap.py             # ✅ Benchmark de rendimiento
│   └── etl_processor.js
│
├── models/                            # Modelos dbt para Lightdash
│   ├── schema.yml                     # Definiciones de esquema
│   ├── comparacion_olap.sql           # Vista de comparación
│   ├── data_marts/                    # Vistas analíticas
│   │   └── (vacío - agregar en futuro)
│   └── olap/                          # Modelos OLAP
│       ├── rolap/
│       │   └── rolap_casos_epidemiologicos.sql
│       ├── molap/
│       │   └── molap_cubo_epidemiologico.sql
│       └── holap/
│           └── holap_epidemiologia_hibrida.sql
│
├── dbt_project.yml                    # Configuración dbt
├── profiles.yml                       # Conexión a DW para dbt
│
├── reservas/                          # Microservicio de reservas
├── disponibilidad/                    # Microservicio de disponibilidad
├── flask_autenticacion/               # Autenticación (Python/Flask)
├── locales_recursos/                  # Administración de recursos (PHP)
│
└── docs/                              # Documentación
    ├── BI_ARQUITECTURA_DATAMART_OLAP.md
    ├── COMPARACION_ROLAP_MOLAP_HOLAP.md
    ├── RESULTADOS_COMPARACION_OLAP.md
    └── diagrama_arquitectura.txt
```

---

## 🚀 Guía de Inicio Rápido

### 1️⃣ Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/davidt369/microservicios-sistema-reservas.git
cd microservicios-sistema-reservas

# Instalar dependencias
npm install
pip install psycopg2-binary

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### 2️⃣ Ejecutar ETL (Cargar datos del OLTP al DW)

```bash
# Ejecutar ETL processor
node script/etl_processor.js

# Salida esperada:
# ✅ Cargados 50,000 pacientes
# ✅ Cargados 50,000 personal médico
# ✅ Cargados 50,000 atenciones
# ✅ Cargados 15 diagnósticos únicos (IMPORTANTE: requiere schema update para 68k)
```

**Nota**: Actualmente carga solo 15 diagnósticos debido al límite de UNIQUE(codigo_cie10). Para cargar los 68,123 diagnósticos, ver sección "Cargar 68k Diagnósticos" abajo.

### 3️⃣ Desplegar Modelos OLAP

```bash
# Desplegar vistas ROLAP, tabla MOLAP y vista HOLAP
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

### 4️⃣ Ejecutar Benchmarks

```bash
# Comparar rendimiento de ROLAP vs MOLAP
python3 script/benchmark_olap.py

# Salida esperada:
# 🔬 BENCHMARK ROLAP vs MOLAP vs HOLAP
# ────────────────────────────────────
# ⏱️  Ejecutando ROLAP... ✅ 350.45 ms (50000 filas)
# ⏱️  Ejecutando MOLAP... ✅ 75.20 ms (54423 filas)
# 🚀 MOLAP es 4.65x más rápido que ROLAP
```

### 5️⃣ Verificar Estado del DW

```bash
# Ver comparación de estrategias OLAP
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT estrategia, filas_totales, nivel_agregacion, implementacion FROM comparacion_olap;"

# Contar registros por estrategia
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT 'ROLAP' as tipo, COUNT(*) as filas FROM rolap_casos_epidemiologicos 
      UNION ALL
      SELECT 'MOLAP', COUNT(*) FROM molap_cubo_epidemiologico 
      UNION ALL
      SELECT 'HOLAP', COUNT(*) FROM holap_epidemiologia_hibrida;"
```

---

## 📊 Consultas OLAP Prácticas

### Ejemplo 1: Top 10 Diagnósticos (MOLAP - Rápido)

```sql
SELECT 
    grupo_enfermedad,
    SUM(total_casos) as casos_totales,
    AVG(promedio_dias_internacion) as dias_promedio,
    AVG(porcentaje_reingreso) as reingreso_promedio
FROM molap_cubo_epidemiologico
WHERE anio = 2025
GROUP BY grupo_enfermedad
ORDER BY casos_totales DESC
LIMIT 10;
```

**Ventaja MOLAP**: Sin JOINs, agregación precalculada, ~50-100ms

### Ejemplo 2: Análisis Detallado (ROLAP - Flexible)

```sql
SELECT 
    p.departamento,
    d.codigo_cie10,
    d.diagnostico,
    COUNT(*) as casos,
    AVG(f.dias_internacion) as dias_promedio,
    SUM(f.costo_total_bs) as costo_total
FROM rolap_casos_epidemiologicos
WHERE anio = 2025 AND mes BETWEEN 1 AND 6
GROUP BY p.departamento, d.codigo_cie10, d.diagnostico
HAVING COUNT(*) > 10
ORDER BY casos DESC;
```

**Ventaja ROLAP**: Datos en tiempo real, drill-down ilimitado, ~300-500ms

### Ejemplo 3: Dashboard Interactivo (HOLAP)

```sql
-- Nivel agregado (rápido, MOLAP)
SELECT 
    anio, mes, departamento, grupo_enfermedad,
    total_casos, costo_total
FROM holap_epidemiologia_hibrida
WHERE nivel_detalle = 'AGREGADO'
ORDER BY total_casos DESC;

-- Detail drill-down (detallado, ROLAP)
SELECT 
    atencion_sk, codigo_cie10, diagnostico, costo_individual
FROM holap_epidemiologia_hibrida
WHERE nivel_detalle = 'DETALLE'
  AND departamento = 'La Paz'
  AND grupo_enfermedad = 'Respiratorias'
LIMIT 100;
```

**Ventaja HOLAP**: Dashboard en 50ms + drill-down sin demora

---

## 💾 Cargar 68k Diagnósticos

**Estado actual**: Solo 15 diagnósticos únicos cargados  
**Motivo**: Constraint `UNIQUE(codigo_cie10)` limita a códigos únicos  
**Solución**: Lanzar schema update y re-ejecutar ETL

### Paso 1: Actualizar Schema DW

```bash
# Ver cambios propuestos
cat db_star.sql

# Aplicar cambios (OPCIÓN A: Recrear tabla)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "DROP TABLE IF EXISTS dim_diagnostico CASCADE;
      CREATE TABLE dim_diagnostico (
          diagnostico_sk SERIAL PRIMARY KEY,
          diagnostico_id_origen VARCHAR(50) NOT NULL,
          codigo_cie10 VARCHAR(10),
          diagnostico VARCHAR(255),
          grupo_enfermedad VARCHAR(100),
          tipo VARCHAR(50),
          es_transmisible BOOLEAN,
          es_cronico BOOLEAN,
          sucursal_sk INTEGER,
          UNIQUE(sucursal_sk, diagnostico_id_origen),
          FOREIGN KEY(sucursal_sk) REFERENCES dim_sucursal(sucursal_sk)
      );"
```

### Paso 2: Re-ejecutar ETL

```bash
# El ETL actualizará buildDiagnosticosPorAtencion() para usar diagnostico_id_origen
node script/etl_processor.js

# Salida esperada:
# ✅ Cargados 50,000 pacientes
# ✅ Cargados 50,000 personal médico
# ✅ Cargados 50,000 atenciones
# ✅ Cargados 68,123 diagnósticos ← 68k!
```

### Paso 3: Re-desplegar MOLAP

```bash
# Recrear cubo MOLAP con 68k diagnósticos
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  < script/deploy_molap_lite.sql
```

---

## 🎨 Integración con Lightdash (BI Visual)

### 1. Instalar Lightdash CLI

```bash
npm install -g @lightdash/cli

# Verificar instalación
lightdash --version
```

### 2. Autenticarse

```bash
lightdash login https://app.lightdash.cloud \
  --token ldpat_0f41a27c36d4eed5235af44c71e88f5a

# Salida esperada:
# ✅️ Login successful!
```

### 3. Desplegar Proyecto

```bash
# Desplegar modelos dbt a Lightdash
lightdash deploy --create \
  --project-name "BI Hospital - Comparación OLAP"

# Salida esperada:
# ✅ Project created: BI Hospital - Comparación OLAP
# ✅ Models compiled and deployed
# 🔗 Access at: https://app.lightdash.cloud/projects/xxx/dashboards
```

### 4. Crear Dashboards

#### Dashboard 1: Comparación ROLAP vs MOLAP
- **Fuente**: `comparacion_olap`
- **Gráfico 1**: Línea temporal de "filas_totales"
- **Gráfico 2**: Columnas de "bytes_estimados" por estrategia
- **Tabla**: Todas las columnas de comparación

#### Dashboard 2: Top Diagnósticos (MOLAP)
- **Fuente**: `molap_cubo_epidemiologico`
- **Métrica**: `SUM(total_casos)`
- **Dimensiones**: `grupo_enfermedad`, `departamento`, `mes`
- **Filtros**: `anio = 2025`

#### Dashboard 3: Drill-Down (HOLAP)
- **Nivel 1**: `holap_epidemiologia_hibrida` con `nivel_detalle='AGREGADO'`
- **Nivel 2**: Click en fila → filtra con `nivel_detalle='DETALLE'`

---

## 📈 Resultados de Benchmark

| Métrica | ROLAP | MOLAP | HOLAP |
|---------|-------|-------|-------|
| **Filas** | 50,000 | 54,423 | 104,423 |
| **Storage** | 0 MB | 43 MB | 43 MB |
| **Tiempo Creación** | 20 ms | 1,702 ms | 10 ms |
| **Consulta Típica** | 300-500 ms | 50-100 ms | 50-500 ms* |
| **Frescura** | < 1 seg | Manual | Mixta |
| **Speedup** | 1x | **4-6x ⚡** | Variable |

*Depende del nivel consultado

---

## 🔧 Comandos Útiles

### Ver logs de ETL
```bash
node script/etl_processor.js 2>&1 | tail -50
```

### Benchmark individual
```bash
# Medir tiempo ROLAP
time PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM rolap_casos_epidemiologicos;"

# Medir tiempo MOLAP
time PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM molap_cubo_epidemiologico;"
```

### Recrear vistas desde cero
```bash
# Opción 1: Script lite (recomendado - cabe en 512MB)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb < script/deploy_molap_lite.sql

# Opción 2: Script completo (requiere plan Pro de Neon)
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb < script/deploy_olap_models.sql
```

### Conectar a DW directamente
```bash
# Client interactivo
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb -p 5432

# En psql:
\dt                    # Ver tablas
\dv                    # Ver vistas
\d dim_tiempo          # Ver estructura
SELECT COUNT(*) FROM fact_atenciones;  # Contar registros
```

---

## ❌ Troubleshooting

### Error: "password authentication failed"
```bash
# Verificar credenciales en .env
cat .env | grep DW_

# Intentar conexión directa
PGPASSWORD='<password>' psql -h <host> -U <user> -d <db>
```

### Error: "project size limit exceeded"
```bash
# Plan gratuito de Neon = 512MB
# Solución: Usar script/deploy_molap_lite.sql (43 MB)
# O: Actualizar a plan Neon Pro ($19/mes)
```

### Error: "could not extend file"
```bash
# El cubo MOLAP completo es demasiado grande
# Usar versión lite:
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb < script/deploy_molap_lite.sql
```

### Error: "relation does not exist"
```bash
# Las vistas OLAP no existen
# Solución: Desplegar primero
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb < script/deploy_molap_lite.sql
```

---

## 📚 Documentación Relacionada

- [BI_ARQUITECTURA_DATAMART_OLAP.md](docs/BI_ARQUITECTURA_DATAMART_OLAP.md) - Documentación BI completa
- [COMPARACION_ROLAP_MOLAP_HOLAP.md](docs/COMPARACION_ROLAP_MOLAP_HOLAP.md) - Guía de uso de modelos OLAP
- [RESULTADOS_COMPARACION_OLAP.md](docs/RESULTADOS_COMPARACION_OLAP.md) - Resultados del despliegue

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/mejora`)
3. Commit cambios (`git commit -am 'Agrega mejora'`)
4. Push a rama (`git push origin feature/mejora`)
5. Crear Pull Request

---

## 📞 Soporte

Para problemas o preguntas:
1. Verificar [Troubleshooting](#troubleshooting)
2. Revisar documentación en `/docs`
3. Contactar al equipo de DevOps

---

## 📜 Licencia

MIT License - Ver LICENSE.md

---

## 🎉 Estado del Proyecto

- ✅ ETL Processor (50k registros)
- ✅ Data Warehouse Star Schema
- ✅ ROLAP (Vista en tiempo real)
- ✅ MOLAP (Cubo precalculado lite)
- ✅ HOLAP (Vista híbrida)
- ✅ Benchmarks de rendimiento
- ✅ Script de despliegue
- ⏳ **Próximo**: Cargar 68k diagnósticos (requiere schema update)
- ⏳ **Próximo**: Dashboards Lightdash

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0  
**Autor**: Sistema BI Hospitalario
