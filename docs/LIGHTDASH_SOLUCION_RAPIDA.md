# 📋 Resumen: Cómo Desplegar en Lightdash (SIN Errores)

## 🎯 El Problema

Cuando ejecutaste:
```bash
lightdash deploy --create --project-name "BI Hospital OLAP"
```

Recibiste dos errores:

```
1. error: unknown option '--project-name'
2. getaddrinfo ENOTFOUND ep-orange-sun-aiyh4lhb-pooler...
```

---

## ✅ La Solución

### Error 1: Flag Incorrecto

El flag `--project-name` **NO EXISTE** en Lightdash CLI.

**Antes (❌ INCORRECTO)**:
```bash
lightdash deploy --create --project-name "BI Hospital OLAP"
```

**Ahora (✅ CORRECTO)**:
```bash
lightdash deploy --create
```

El nombre del proyecto se pide interactivamente cuando ejecutas el comando.

---

### Error 2: Host Incorrecto

El error `getaddrinfo ENOTFOUND ep-orange-sun-aiyh4lhb-pooler` significa que está intentando conectar al host **con** `-pooler`, pero debería ser **sin** `-pooler`.

**Verificar**:
```bash
grep "host:" profiles.yml
```

**Debe mostrar** (sin `-pooler`):
```
host: ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech      ✅
```

**NO** (con `-pooler`):
```
host: ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech ❌
```

**Si está mal, corregir**:
```bash
cd /workspaces/microservicios-sistema-reservas
sed -i 's/ep-orange-sun-aiyh4lhb-pooler/ep-orange-sun-aiyh4lhb/g' profiles.yml

# Verificar
grep "host:" profiles.yml
```

---

## 🚀 Despliegue Correcto (Paso a Paso)

### Paso 1: Navegar al proyecto
```bash
cd /workspaces/microservicios-sistema-reservas
```

### Paso 2: Verificar prerequisitos
```bash
# Lightdash instalado
lightdash --version

# dbt instalado  
dbt --version

# Autenticado en Lightdash
lightdash whoami
```

Si falta algo:
```bash
npm install -g @lightdash/cli@latest
pip install --upgrade dbt-postgres
lightdash login https://app.lightdash.cloud --token ldpat_0f41a27c36d4eed5235af44c71e88f5a
```

### Paso 3: Probar conexión a DW
```bash
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
  -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "SELECT COUNT(*) FROM fact_atenciones;"

# Debe retornar: 50000
```

### Paso 4: Desplegar (SIN --project-name)
```bash
lightdash deploy --create
```

### Paso 5: Responder a los prompts
```
? What is the name of your new project?
→ BI Hospital - Comparación OLAP

? Do you want to enable scheduler to run queries periodically?
→ No (o Yes si quieres actualizar cubo MOLAP automáticamente)
```

### Paso 6: ¡Listo!
```
✅ Project created successfully!
🔗 Access your project at: https://app.lightdash.cloud/projects/xxxx
```

---

## 📊 Después del Despliegue

### Crear tu Primer Dashboard

1. Abre https://app.lightdash.cloud
2. Selecciona tu proyecto
3. Crea un nuevo dashboard
4. Agrega visualizaciones:
   - **Tabla**: `comparacion_olap` (muestra ROLAP vs MOLAP vs HOLAP)
   - **Gráfico**: `molap_cubo_epidemiologico` (top diagnósticos)
   - **Tabla**: `rolap_casos_epidemiologicos` (análisis detallado)

---

## 🔗 Documentación Relacionada

- **Guía Rápida**: [LIGHTDASH_QUICK_DEPLOY.md](docs/LIGHTDASH_QUICK_DEPLOY.md)
- **Troubleshooting**: [LIGHTDASH_DEPLOY_FIX.md](docs/LIGHTDASH_DEPLOY_FIX.md)
- **Despliegue Completo**: [DEPLOYMENT.md](DEPLOYMENT.md) Paso 4
- **Referencia Rápida**: [CHEATSHEET.md](CHEATSHEET.md)

---

## ✨ Resumen Rápido

| Antes | Después |
|-------|---------|
| `lightdash deploy --create --project-name "..."` | `lightdash deploy --create` |
| Host con `-pooler` | Host sin `-pooler` ✅ |
| Error de conexión | ✅ Despliegue exitoso |
| Error de flag | ✅ Prompts interactivos |

---

**¡Ya está! 🎉 Tu proyecto BI está en Lightdash Cloud.**

Próximos pasos:
1. ✅ Despliegue completado
2. ⏭️ Crear dashboards
3. ⏭️ Invitar usuarios
4. ⏭️ Compartir insights

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026
