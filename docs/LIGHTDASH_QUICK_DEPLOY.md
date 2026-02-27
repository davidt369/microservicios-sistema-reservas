# 🎯 Desplegar a Lightdash - Guía Sin Errores

## ⚡ Forma Rápida (3 minutos)

### Opción 1: Despliegue Manual (Recomendado)

```bash
cd /workspaces/microservicios-sistema-reservas

# Comando correcto (SIN --project-name)
lightdash deploy --create
```

Cuando pida información, responde:
```
? What is the name of your new project?
→ BI Hospital - Comparación OLAP

? Do you want to enable scheduler?
→ No (o Yes si quieres)

✅ Listo!
```

### Opción 2: Script Automatizado

```bash
cd /workspaces/microservicios-sistema-reservas
bash script/deploy_lightdash_automated.sh

# Responde a los prompts
```

---

## ✅ Verificar Prerequisitos

### 1. Lightdash Instalado
```bash
lightdash --version
# Debe mostrar: v0.xxx+
```

Si falta:
```bash
npm install -g @lightdash/cli
```

### 2. dbt Instalado
```bash
dbt --version
# Debe mostrar: Core: v1.7.0+
```

Si falta:
```bash
pip install dbt-postgres
```

### 3. Autenticado en Lightdash
```bash
lightdash whoami
# Debe mostrar tu email
```

Si no:
```bash
lightdash login https://app.lightdash.cloud \
  --token ldpat_0f41a27c36d4eed5235af44c71e88f5a
```

### 4. Conexión a DW
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM fact_atenciones;"

# Debe retornar: 50000
```

---

## 🚀 Pasos de Despliegue

### Paso 1: Navegar al proyecto
```bash
cd /workspaces/microservicios-sistema-reservas
```

### Paso 2: Compilar modelos (verificación)
```bash
dbt compile --profiles-dir .

# Debe mostrar algo como:
# ✅ Found 4 models
```

### Paso 3: Desplegar
```bash
lightdash deploy --create
```

### Paso 4: Responder prompts
```
? What is the name of your new project?
→ BI Hospital - Comparación OLAP

? Do you want to enable scheduler to run queries periodically?
→ No
```

### Paso 5: ¡Acceder!
```
✅ Project created successfully!
🔗 Access at: https://app.lightdash.cloud/projects/xxxx
```

---

## 📊 Crear Dashboards

Una vez desplegado, crea dashboards con estas visualizaciones:

### Dashboard 1: Comparación OLAP

```
1. Nuevo dashboard → "OLAP Comparison"
2. Agregar tabla: "comparacion_olap"
3. Mostrar:
   • estrategia (ROLAP, MOLAP, HOLAP)
   • filas_totales
   • nivel_agregacion
   • bytes_estimados
4. Guardar
```

### Dashboard 2: Top Diagnósticos (MOLAP)

```
1. Nuevo dashboard → "Top Diagnósticos"
2. Agregar gráfico de barras
3. Tabla: "molap_cubo_epidemiologico"
4. Eje X: "grupo_enfermedad"
5. Eje Y: SUM("total_casos")
6. Filtro: anio = 2025
7. Límite: Top 10
8. Guardar
```

### Dashboard 3: Análisis Interactivo (ROLAP)

```
1. Nuevo dashboard → "Análisis Detallado"
2. Agregar tabla: "rolap_casos_epidemiologicos"
3. Filtros:
   • anio = 2025
   • mes = (mes actual)
4. Drill-down por:
   • departamento
   • grupo_enfermedad
5. Guardar
```

---

## ❌ Errores Comunes y Solución

### Error: "unknown option '--project-name'"

```bash
# ❌ INCORRECTO
lightdash deploy --create --project-name "BI Hospital"

# ✅ CORRECTO
lightdash deploy --create
```

### Error: "getaddrinfo ENOTFOUND ep-xxx-pooler"

Verificar que `profiles.yml` tiene el host SIN `-pooler`:

```bash
grep "host:" profiles.yml
# Debe ser: ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech
# NO:       ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech
```

Si está mal, corregir:
```bash
cd /workspaces/microservicios-sistema-reservas
sed -i 's/ep-orange-sun-aiyh4lhb-pooler/ep-orange-sun-aiyh4lhb/g' profiles.yml
```

### Error: "Cannot find module"

```bash
# Reinstalar Lightdash
npm install -g @lightdash/cli@latest

# Reinstalar dbt
pip install --upgrade dbt-postgres
```

### Error: "password authentication failed"

Verificar credenciales:
```bash
echo "Host: ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech"
echo "User: neondb_owner"
echo "Password: npg_jr5fHxYAJU2S (no cambiar)"
echo "Database: neondb"
```

Probar:
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT 1;"
```

---

## 🎉 ¡Listo!

Una vez desplegado:

1. ✅ Modelos compilados y disponibles en Lightdash
2. ✅ ROLAP, MOLAP, HOLAP listos para consultas
3. ✅ Puedes crear dashboards interactivos
4. ✅ Invitar a otros usuarios al proyecto

---

## 📞 Problemas Adicionales

Si tienes otros problemas, revisa:
- [LIGHTDASH_DEPLOY_FIX.md](LIGHTDASH_DEPLOY_FIX.md) - Guía detallada de solución de errores
- [CHEATSHEET.md](../CHEATSHEET.md) - Referencia rápida de comandos
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guía completa de despliegue

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026  
**¡Happy Data Warehousing! 🚀**
