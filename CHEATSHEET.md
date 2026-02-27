# 📋 Cheat Sheet - Referencia Rápida de Comandos

## 🚀 Comandos Principales

### Setup Inicial
```bash
git clone https://github.com/davidt369/microservicios-sistema-reservas.git
cd microservicios-sistema-reservas
npm install && pip install psycopg2-binary
cp .env.example .env && nano .env
```

### ETL - Cargar datos
```bash
node script/etl_processor.js
```

### OLAP - Desplegar modelos
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb < script/deploy_molap_lite.sql
```

### Benchmark - Medir rendimiento
```bash
python3 script/benchmark_olap.py
```

### Lightdash - Desplegar BI
```bash
npm install -g @lightdash/cli
lightdash login https://app.lightdash.cloud --token ldpat_0f41a27c36d4eed5235af44c71e88f5a
lightdash deploy --create --project-name "BI Hospital"
```

---

## 🔍 Verificación Rápida

### Conectar a DW
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb

# En psql:
\dt                          # Ver tablas
\dv                          # Ver vistas
SELECT COUNT(*) FROM fact_atenciones;
```

### Contar registros por modelo
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb -c \
  "SELECT 'ROLAP' as tipo, COUNT(*) as filas FROM rolap_casos_epidemiologicos
   UNION ALL
   SELECT 'MOLAP', COUNT(*) FROM molap_cubo_epidemiologico
   UNION ALL
   SELECT 'HOLAP', COUNT(*) FROM holap_epidemiologia_hibrida;"
```

### Ver comparación OLAP
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb -c \
  "SELECT * FROM comparacion_olap;"
```

---

## 📊 Queries OLAP por Estrategia

### ROLAP - Tiempo Real (Flexible)
```sql
-- Top 10 diagnósticos con detalle
SELECT 
    codigo_cie10,
    diagnostico,
    departamento,
    COUNT(*) as casos,
    AVG(costo_total_bs) as costo_promedio
FROM rolap_casos_epidemiologicos
WHERE anio = 2025
GROUP BY codigo_cie10, diagnostico, departamento
HAVING COUNT(*) > 5
ORDER BY casos DESC
LIMIT 10;
```

### MOLAP - Precalculado (Rápido)
```sql
-- Top 10 diagnósticos (sin JOINs, ya agregados)
SELECT 
    grupo_enfermedad,
    SUM(total_casos) as casos,
    AVG(promedio_dias_internacion) as dias_prom,
    AVG(costo_promedio) as costo_prom
FROM molap_cubo_epidemiologico
WHERE anio = 2025
GROUP BY grupo_enfermedad
ORDER BY casos DESC
LIMIT 10;
```

### HOLAP - Híbrido (Flexible + Rápido)
```sql
-- Dashboard agregado (MOLAP - rápido)
SELECT 
    anio, mes, departamento, grupo_enfermedad,
    total_casos, costo_total
FROM holap_epidemiologia_hibrida
WHERE nivel_detalle = 'AGREGADO'
ORDER BY total_casos DESC
LIMIT 20;

-- Drill-down a detalle (ROLAP - flexible)
SELECT 
    atencion_sk, codigo_cie10, diagnostico, costo_individual
FROM holap_epidemiologia_hibrida
WHERE nivel_detalle = 'DETALLE'
  AND departamento = 'La Paz'
LIMIT 100;
```

---

## 📈 Benchmark Commands

### Medir individual
```bash
# ROLAP (tiempo real)
time PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM rolap_casos_epidemiologicos;"

# MOLAP (precalculado)
time PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM molap_cubo_epidemiologico;"
```

### Script completo
```bash
python3 script/benchmark_olap.py
```

---

## 🛠 Troubleshooting una Línea

| Problema | Solución |
|----------|----------|
| "password auth failed" | `export PGPASSWORD='npg_jr5fHxYAJU2S'` |
| "relation does not exist" | `psql ... < script/deploy_molap_lite.sql` |
| "project size limit" | Use `deploy_molap_lite.sql` (43MB, not full) |
| "could not extend file" | Same as above, lite version |
| "module not found" | `npm install` |
| "psql not found" | `sudo apt install postgresql-client` |

---

## 📁 Archivos Importantes

```
README.md              ← Guía general (lee esto primero)
QUICKSTART.md          ← Inicio en 5 minutos (rápido)
DEPLOYMENT.md          ← Pasos detallados del despliegue
CHEATSHEET.md          ← Este archivo (comandos rápidos)

script/
  etl_processor.js     ← Carga datos OLTP → DW
  deploy_molap_lite.sql ← Despliega ROLAP + MOLAP + HOLAP
  benchmark_olap.py    ← Mide rendimiento

docs/
  BI_ARQUITECTURA_DATAMART_OLAP.md
  COMPARACION_ROLAP_MOLAP_HOLAP.md
  RESULTADOS_COMPARACION_OLAP.md
```

---

## 🎯 Flujo Típico

```
1. Setup              npm install && cp .env.example .env
                      ↓
2. ETL               node script/etl_processor.js
                      ↓
3. OLAP Deploy       psql < script/deploy_molap_lite.sql
                      ↓
4. Benchmark         python3 script/benchmark_olap.py
                      ↓
5. Lightdash (opt)   lightdash deploy --create
```

**Tiempo total**: ~5-10 minutos

---

## 💾 Schema DW

```
fact_atenciones (50k)          dim_paciente (50k)
├─ atencion_sk                 ├─ paciente_sk
├─ tiempo_sk → dim_tiempo       ├─ sexo
├─ paciente_sk → dim_paciente   ├─ edad
├─ diagnostico_principal_sk     ├─ grupo_etario
├─ sucursal_sk → dim_sucursal   ├─ departamento
├─ cantidad_diagnosticos        └─ municipio
├─ dias_internacion
├─ reingreso_30d
└─ costo_total_bs (3.7B Bs)

dim_diagnostico (15)           dim_tiempo (3.6k)
├─ diagnostico_sk              ├─ tiempo_sk
├─ codigo_cie10                ├─ fecha
├─ diagnostico                 ├─ anio
├─ grupo_enfermedad            ├─ mes
├─ tipo                        ├─ nombre_mes
├─ es_transmisible             ├─ trimestre
└─ es_cronico                  └─ ...

dim_sucursal (x)               dim_personal (50k)
├─ sucursal_sk                 ├─ personal_sk
├─ nombre_hospital             ├─ apellido
├─ ubicacion                   ├─ nombre
└─ ...                         └─ especialidad
```

---

## 🎓 Aprendizajes Clave

| Concepto | Detalle |
|----------|---------|
| **ROLAP** | Vistas en tiempo real, 0 storage adicional, 300-500ms |
| **MOLAP** | Cubos precalculados, 43MB storage, 50-100ms, 5x rápido |
| **HOLAP** | Híbrido: MOLAP para dashboard + ROLAP para drill-down |

---

## 🔗 Enlaces Útiles

- [GitHub Repo](https://github.com/davidt369/microservicios-sistema-reservas)
- [Lightdash Cloud](https://app.lightdash.cloud)
- [Neon Console](https://console.neon.tech)
- [Supabase Dashboard](https://app.supabase.com)

---

**Pro Tips** 💡
- Use `PGPASSWORD=...` para evitar prompts
- Use `-A` (no aligned) para outputs más limpios en scripts
- Use `\timing on` en psql para medir tiempos automáticamente
- Guarda queries frecuentes en `~/.psqlrc`

---

**Última actualización**: Febrero 2026 | **Versión**: 1.0
