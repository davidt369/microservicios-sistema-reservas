#!/bin/bash

# ================================================
# Script de Despliegue a Lightdash - Forma No-Interactiva
# ================================================
# Ejecutar como: bash script/deploy_lightdash_automated.sh

set -e

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🚀 Desplegando a Lightdash (Automatizado)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Verificar prerequisites
echo "✅ Verificando prerequisites..."

# 1. Lightdash instalado
if ! command -v lightdash &> /dev/null; then
    echo "❌ Lightdash CLI no está instalado"
    echo "   Ejecutar: npm install -g @lightdash/cli"
    exit 1
fi

# 2. dbt instalado
if ! command -v dbt &> /dev/null; then
    echo "❌ dbt no está instalado"
    echo "   Ejecutar: pip install dbt-postgres"
    exit 1
fi

# 3. Conexión a DW
echo "✅ Probando conexión a Data Warehouse..."
if ! PGPASSWORD='npg_jr5fHxYAJU2S' psql \
    -h ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech \
    -U neondb_owner -d neondb \
    -c "SELECT 1" &>/dev/null; then
    echo "❌ No hay conexión a la base de datos"
    echo "   Verificar: profiles.yml"
    exit 1
fi

echo "✅ Conexión exitosa"

# 4. Compilar dbt
echo ""
echo "✅ Compilando modelos dbt..."
dbt compile --profiles-dir . --quiet || {
    echo "❌ Error compilando dbt"
    exit 1
}

# 5. Listar modelos
echo ""
echo "✅ Modelos disponibles:"
dbt ls --profiles-dir . 2>/dev/null | grep -E "^bi_hospital\." || echo "   (modelos listados)"

# 6. Info de Lightdash
echo ""
echo "✅ Información de Lightdash:"
lightdash --version
echo ""
echo "📌 IMPORTANTE: El siguiente comando abrirá una interfaz interactiva"
echo "   Deberás responder a las preguntas en la terminal"
echo ""
echo "   1. Nombre del proyecto: (usa este nombre)"
echo "      'BI Hospital - Comparación OLAP'"
echo "   2. Scheduler: No (a menos que quieras)"
echo ""

read -p "¿Continuar? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Abortado"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Iniciando despliegue..."
echo "════════════════════════════════════════════════════════════════"
echo ""

# 7. Deploy (interactivo - el usuario verá los prompts)
cd /workspaces/microservicios-sistema-reservas
lightdash deploy --create

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Despliegue completado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Tu proyecto está disponible en Lightdash:"
echo "   https://app.lightdash.cloud"
echo ""
echo "📊 Próximos pasos:"
echo "1. Crea un nuevo dashboard"
echo "2. Agrega estas visualizaciones:"
echo "   • comparacion_olap (tabla)"
echo "   • rolap_casos_epidemiologicos (table/chart)"
echo "   • molap_cubo_epidemiologico (table/chart)"
echo "   • holap_epidemiologia_hibrida (table/chart)"
echo ""
echo "💡 Sugerencias de dashboards:"
echo "   • Dashboard 1: Comparación OLAP (usa tabla comparacion_olap)"
echo "   • Dashboard 2: Top Diagnósticos (molap_cubo_epidemiologico)"
echo "   • Dashboard 3: Drill-Down (holap_epidemiologia_hibrida)"
echo ""
