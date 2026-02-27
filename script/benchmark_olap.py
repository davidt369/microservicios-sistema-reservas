#!/usr/bin/env python3
"""
Benchmark de rendimiento ROLAP vs MOLAP vs HOLAP
Ejecuta consultas idénticas en las 3 estrategias y mide tiempos de respuesta
"""

import psycopg2
import time
from datetime import datetime

# Configuración de conexión al DW
DB_CONFIG = {
    'host': 'ep-orange-sun-aiyh4lhb.c-4.us-east-1.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_jr5fHxYAJU2S',
    'port': 5432,
    'sslmode': 'require'
}

# Consultas de benchmark
QUERIES = {
    'count_total': {
        'rolap': 'SELECT COUNT(*) FROM rolap_casos_epidemiologicos;',
        'molap': 'SELECT COUNT(*) FROM molap_cubo_epidemiologico;',
        'holap_agregado': "SELECT COUNT(*) FROM holap_epidemiologia_hibrida WHERE nivel_detalle = 'AGREGADO';",
        'holap_detalle': "SELECT COUNT(*) FROM holap_epidemiologia_hibrida WHERE nivel_detalle = 'DETALLE';"
    },
    'top_10_departamentos': {
        'rolap': '''
            SELECT departamento, COUNT(*) as casos
            FROM rolap_casos_epidemiologicos
            WHERE anio = 2025
            GROUP BY departamento
            ORDER BY casos DESC
            LIMIT 10;
        ''',
        'molap': '''
            SELECT departamento, SUM(total_casos) as casos
            FROM molap_cubo_epidemiologico
            WHERE anio = 2025
            GROUP BY departamento
            ORDER BY casos DESC
            LIMIT 10;
        '''
    },
    'casos_por_enfermedad': {
        'rolap': '''
            SELECT grupo_enfermedad, COUNT(*) as casos, 
                   AVG(costo_total_bs) as costo_promedio
            FROM rolap_casos_epidemiologicos
            WHERE anio = 2025 AND mes BETWEEN 1 AND 6
            GROUP BY grupo_enfermedad
            ORDER BY casos DESC
            LIMIT 20;
        ''',
        'molap': '''
            SELECT grupo_enfermedad, SUM(total_casos) as casos,
                   AVG(costo_promedio) as costo_promedio
            FROM molap_cubo_epidemiologico
            WHERE anio = 2025 AND mes BETWEEN 1 AND 6
            GROUP BY grupo_enfermedad
            ORDER BY casos DESC
            LIMIT 20;
        '''
    }
}

def ejecutar_query(cursor, query, nombre):
    """Ejecuta una query y mide el tiempo de ejecución"""
    try:
        inicio = time.time()
        cursor.execute(query)
        resultados = cursor.fetchall()
        fin = time.time()
        tiempo_ms = (fin - inicio) * 1000
        
        return {
            'nombre': nombre,
            'tiempo_ms': round(tiempo_ms, 2),
            'filas': len(resultados),
            'exito': True
        }
    except Exception as e:
        return {
            'nombre': nombre,
            'error': str(e),
            'exito': False
        }

def ejecutar_benchmark():
    """Ejecuta todas las queries de benchmark"""
    print("=" * 80)
    print("🔬 BENCHMARK ROLAP vs MOLAP vs HOLAP")
    print("=" * 80)
    print(f"Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Conectar a la base de datos
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Conexión establecida a Neon PostgreSQL\n")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return
    
    resultados_globales = {}
    
    # Ejecutar cada conjunto de queries
    for nombre_test, queries in QUERIES.items():
        print(f"\n{'─' * 80}")
        print(f"📊 Test: {nombre_test.upper()}")
        print(f"{'─' * 80}\n")
        
        resultados_test = {}
        
        for estrategia, query in queries.items():
            print(f"⏱️  Ejecutando {estrategia}...", end=' ')
            resultado = ejecutar_query(cursor, query, estrategia)
            resultados_test[estrategia] = resultado
            
            if resultado['exito']:
                print(f"✅ {resultado['tiempo_ms']} ms ({resultado['filas']} filas)")
            else:
                print(f"❌ Error: {resultado.get('error', 'desconocido')}")
        
        # Calcular speedup de MOLAP vs ROLAP
        if 'rolap' in resultados_test and 'molap' in resultados_test:
            if resultados_test['rolap']['exito'] and resultados_test['molap']['exito']:
                speedup = resultados_test['rolap']['tiempo_ms'] / resultados_test['molap']['tiempo_ms']
                print(f"\n🚀 MOLAP es {speedup:.2f}x más rápido que ROLAP")
        
        resultados_globales[nombre_test] = resultados_test
    
    # Resumen final
    print(f"\n\n{'=' * 80}")
    print("📈 RESUMEN DE RENDIMIENTO")
    print(f"{'=' * 80}\n")
    
    for nombre_test, resultados_test in resultados_globales.items():
        print(f"{nombre_test}:")
        for estrategia, resultado in resultados_test.items():
            if resultado['exito']:
                print(f"  {estrategia:20s}: {resultado['tiempo_ms']:>8.2f} ms")
        print()
    
    # Consulta de comparación de objetos
    print(f"\n{'─' * 80}")
    print("📊 COMPARACIÓN DE ESTRATEGIAS OLAP")
    print(f"{'─' * 80}\n")
    
    cursor.execute("SELECT * FROM comparacion_olap ORDER BY estrategia;")
    comparaciones = cursor.fetchall()
    
    print(f"{'Estrategia':<12} {'Filas':<10} {'Nivel':<15} {'Implementación'}")
    print(f"{'─' * 12} {'─' * 10} {'─' * 15} {'─' * 30}")
    
    for comp in comparaciones:
        estrategia = comp[0]
        filas = comp[1]
        nivel = comp[4]
        implementacion = comp[5]
        print(f"{estrategia:<12} {filas:<10} {nivel:<15} {implementacion}")
    
    # Cerrar conexión
    cursor.close()
    conn.close()
    print(f"\n✅ Benchmark completado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 80}\n")

if __name__ == '__main__':
    ejecutar_benchmark()
