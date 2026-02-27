#!/bin/bash

# ================================================
# Script de Despliegue a Lightdash
# ================================================
# Ejecutar como: bash script/deploy_lightdash.sh

set -e  # Exit on error

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🚀 Desplegando a Lightdash"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Verificar que Lightdash está instalado
echo "✅ Verificando Lightdash CLI..."
lightdash --version || {
    echo "❌ Lightdash no está instalado"
    echo "Instalar con: npm install -g @lightdash/cli"
    exit 1
}

# 2. Verificar datos en DW
echo ""
echo "✅ Verificando conexión a Data Warehouse..."
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
    -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
    -U neondb_owner -d neondb \
    -c "SELECT 'DW conectado' || ' - ' || COUNT(*) || ' atenciones' 
        FROM fact_atenciones;" || {
    echo "❌ No hay conexión a la base de datos"
    exit 1
}

# 3. Verificar que los modelos OLAP existen
echo ""
echo "✅ Verificando modelos OLAP..."
PGPASSWORD='npg_jr5fHxYAJU2S' psql \
    -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
    -U neondb_owner -d neondb \
    -c "SELECT 'ROLAP' as modelo, COUNT(*) FROM rolap_casos_epidemiologicos
        UNION ALL
        SELECT 'MOLAP', COUNT(*) FROM molap_cubo_epidemiologico
        UNION ALL
        SELECT 'HOLAP', COUNT(*) FROM holap_epidemiologia_hibrida;" || {
    echo "❌ Modelos OLAP no encontrados"
    echo "Ejecutar primero: psql < script/deploy_molap_lite.sql"
    exit 1
}

# 4. Compilar dbt
echo ""
echo "✅ Compilando modelos dbt..."
dbt compile --profiles-dir . 2>&1 | grep -E "(Found|Error)" || echo "   Compilación completada"

# 5. Desplegar a Lightdash
echo ""
echo "✅ Desplegando a Lightdash..."
echo ""
echo "NOTA: Lightdash abrirá una interfaz interactiva"
echo "Sigue los pasos en la pantalla para completar el despliegue"
echo ""

# Ejecutar despliegue
# El flag correcto es solo --create (sin --project-name)
lightdash deploy --create

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Despliegue completado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Tu proyecto está disponible en:"
echo "   https://app.lightdash.cloud/projects/xxxx/dashboards"
echo ""
echo "Próximos pasos:"
echo "1. Ve a https://app.lightdash.cloud"
echo "2. Crea tu primer dashboard"
echo "3. Agrega visualizaciones de los modelos:"
echo "   - comparacion_olap"
echo "   - rolap_casos_epidemiologicos"
echo "   - molap_cubo_epidemiologico"
echo "   - holap_epidemiologia_hibrida"
echo ""
