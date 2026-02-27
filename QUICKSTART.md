# ⚡ Quick Start - Guía de 5 Minutos

## 🎯 Objetivo
Ejecutar el sistema BI completo con ROLAP, MOLAP y HOLAP en 5 minutos.

---

## 1️⃣ Clonar y Setup (1 min)

```bash
git clone https://github.com/davidt369/microservicios-sistema-reservas.git
cd microservicios-sistema-reservas
npm install
cp .env.example .env
```

---

## 2️⃣ Cargar Datos ETL (2 minutos)

```bash
node script/etl_processor.js

# ✅ Resultado esperado:
# ✅ Cargados 50,000 pacientes
# ✅ Cargados 50,000 personal
# ✅ Cargados 50,000 atenciones
# ✅ Cargados 15 diagnósticos
```

---

## 3️⃣ Desplegar OLAP (1 minuto)

```bash
# Desplegar ROLAP, MOLAP y HOLAP en el DW
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  < script/deploy_molap_lite.sql

# ✅ Resultado esperado:
# ✅ Vista ROLAP creada
# ✅ Tabla MOLAP creada
# ✅ Vista HOLAP creada
```

---

## 4️⃣ Ejecutar Benchmarks (1 minuto)

```bash
python3 script/benchmark_olap.py

# ✅ Resultado esperado:
# 🚀 MOLAP es 5x más rápido que ROLAP
# 📈 Benchmark completado exitosamente
```

---

## ✅ ¡Listo!

Ahora tienes:
- ✅ **ROLAP**: Datos en tiempo real (300-500ms)
- ✅ **MOLAP**: Cubos precalculados (50-100ms, **5x más rápido**)
- ✅ **HOLAP**: Vista híbrida para drill-down

---

## 📊 Consultas de Ejemplo

### Rápida (MOLAP)
```sql
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT grupo_enfermedad, SUM(total_casos) 
      FROM molap_cubo_epidemiologico 
      GROUP BY grupo_enfermedad 
      ORDER BY 2 DESC LIMIT 10;"
```

### Flexible (ROLAP)
```sql
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT departamento, COUNT(*) 
      FROM rolap_casos_epidemiologicos 
      WHERE anio = 2025 
      GROUP BY departamento;"
```

### Híbrida (HOLAP)
```sql
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT * FROM holap_epidemiologia_hibrida 
      WHERE nivel_detalle = 'AGREGADO' 
      LIMIT 10;"
```

---

## 🎨 Desplegar en Lightdash (Opcional)

```bash
npm install -g @lightdash/cli

lightdash login https://app.lightdash.cloud \
  --token ldpat_0f41a27c36d4eed5235af44c71e88f5a

lightdash deploy --create \
  --project-name "BI Hospital Quick Start"
```

---

## 📚 Documentación Completa

- [README.md](README.md) - Guía general del proyecto
- [DEPLOYMENT.md](DEPLOYMENT.md) - Pasos detallados del despliegue
- [docs/COMPARACION_ROLAP_MOLAP_HOLAP.md](docs/COMPARACION_ROLAP_MOLAP_HOLAP.md) - Comparación técnica
- [docs/BI_ARQUITECTURA_DATAMART_OLAP.md](docs/BI_ARQUITECTURA_DATAMART_OLAP.md) - Arquitectura BI completa

---

**¡Disfruta tu Data Warehouse!** 🚀
