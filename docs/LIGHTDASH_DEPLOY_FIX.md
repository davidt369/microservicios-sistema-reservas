# 🚀 Solución: Error de Lightdash Deploy

## 📌 Problema

Cuando ejecutas:
```bash
lightdash deploy --create --project-name "BI Hospital OLAP"
```

Recibes estos errores:

### Error 1: "unknown option '--project-name'"
```
error: unknown option '--project-name'
Run ⚡️lightdash help [command] for more information
```

**Causa**: El flag `--project-name` no existe en esta versión de Lightdash CLI.

### Error 2: "getaddrinfo ENOTFOUND ep-orange-sun-aiyh4lhb-pooler..."
```
getaddrinfo ENOTFOUND ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech
```

**Causa**: El host está incorrecto (con `-pooler`). Debe ser sin `-pooler`.

---

## ✅ Solución

### Paso 1: Usar el comando correcto

```bash
# ❌ INCORRECTO
lightdash deploy --create --project-name "BI Hospital OLAP"

# ✅ CORRECTO
lightdash deploy --create
```

### Paso 2: Verificar profiles.yml

Asegúrate que el host sea **sin** `-pooler`:

```bash
cat profiles.yml | grep host
```

**Debe mostrar**:
```
host: ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech  ✅ CORRECTO
```

**NO**:
```
host: ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech  ❌ INCORRECTO
```

Si está incorrecto, corregir:
```bash
sed -i 's/ep-orange-sun-aiyh4lhb-pooler/ep-orange-sun-aiyh4lhb/g' profiles.yml
```

### Paso 3: Verificar conexión a DW

```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM fact_atenciones;"

# Debe retornar: 50000
```

### Paso 4: Ejecutar despliegue

```bash
cd /workspaces/microservicios-sistema-reservas

# Opción A: Despliegue interactivo (recomendado)
lightdash deploy --create

# Opción B: Script automatizado
bash script/deploy_lightdash.sh
```

---

## 🖥️ Pasos en la Interfaz de Lightdash

Cuando ejecutes `lightdash deploy --create`, verás una interfaz interactiva:

```
✨ Lightdash - v0.xxx
⚡️ Syncing dbt project...

? What is the name of your new project?
→ BI Hospital - Comparación OLAP

? Do you want to enable scheduler to run queries periodically?
→ No (o Yes si quieres)

✅ Project created successfully!
🔗 Access at: https://app.lightdash.cloud/projects/xxxx/dashboards
```

**Sigue los prompts y completa el despliegue.**

---

## 📊 Después del Despliegue

Una vez completado, deberías ver:

```
✅ Testing adaptor... OK
✅ Compiling... 4 models
✅ Creating project... BI Hospital - Comparación OLAP
✅ Project deployed successfully!

🎉 Access your project:
https://app.lightdash.cloud/projects/xxxx
```

---

## 🔍 Verificación Rápida

```bash
# 1. Ver que Lightdash está loggeado
lightdash whoami

# 2. Ver proyectos desplegados
lightdash projects list

# 3. Compilar sin desplegar (testing)
dbt compile --profiles-dir .

# 4. Ver modelos disponibles
dbt ls --profiles-dir .
```

---

## ❌ Si sigue fallando

### Problema: "Cannot find module"
```bash
npm install -g @lightdash/cli@latest
```

### Problema: "dbt not found"
```bash
pip install dbt-postgres
```

### Problema: "profiles.yml not found"
```bash
ls -la /workspaces/microservicios-sistema-reservas/profiles.yml
```

### Problema: Credenciales inválidas
```bash
# Verificar que las credenciales en profiles.yml son correctas:
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -p 5432 \
  -U neondb_owner \
  -d neondb \
  -c "SELECT 'OK'"
```

---

## 📋 Comandos Finales Correctos

```bash
# Instalación completa
npm install -g @lightdash/cli
pip install dbt-postgres

# Navegar al proyecto
cd /workspaces/microservicios-sistema-reservas

# Verificar conexión
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM fact_atenciones;"

# Desplegar SIN el flag --project-name
lightdash deploy --create

# Responder a los prompts interactivos
# Nombre: "BI Hospital - Comparación OLAP"
# Scheduler: No (opcional)

# ¡Listo!
```

---

## 🎯 Resumen de Cambios

| Antes | Después |
|-------|---------|
| `lightdash deploy --create --project-name "..."` | `lightdash deploy --create` |
| Host con `-pooler` | Host sin `-pooler` |
| Error de conexión | ✅ Despliegue exitoso |

---

## 📚 Referencias

- [Lightdash CLI Docs](https://docs.lightdash.com/guides/lightdash-cli)
- [dbt Documentation](https://docs.getdbt.com)
- [Neon Connection Docs](https://neon.tech/docs/connect/connection-pooling)

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026  
**Autor**: Sistema BI Hospitalario
