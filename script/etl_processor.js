const { Pool } = require('pg');

const DEFAULT_BATCH_SIZE = 500;
const FACT_BATCH_SIZE = 1000;

const dwConfig = {
    user: 'neondb_owner',
    host: 'ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech',
    database: 'neondb',
    password: 'npg_jr5fHxYAJU2S',
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

const grupo1 = {
    nombre: 'Grupo 1',
    sistema: 'Supabase-Clinico',
    sourceConfig: {
        user: 'usuario1.fgzrkjkflenmdmyfnkpr',
        host: 'aws-0-us-west-2.pooler.supabase.com',
        database: 'postgres',
        password: 'upds2026',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    },
    mappings: {
        pacientes: {
            table: 'public.pacientes',
            cols: {
                id_origen: 'paciente_id',
                ci: 'NULL',
                nombre: 'nombre',
                nacimiento: 'fecha_nacimiento',
                genero: 'genero'
            }
        },
        medicos: {
            table: 'public.personal',
            cols: {
                id_origen: 'personal_id',
                nombre: 'nombre',
                especialidad: 'especialidad',
                cargo: 'cargo'
            }
        },
        atenciones: {
            table: 'public.atenciones',
            cols: {
                id_origen: 'atencion_id',
                paciente_id: 'paciente_id',
                medico_id: 'personal_id',
                fecha: 'fecha_atencion',
                estado: 'estado',
                motivo: 'motivo_consulta',
                costo: '0'
            }
        },
        diagnosticos: {
            table: 'public.diagnosticos',
            cols: {
                id_origen: 'diagnostico_id',
                atencion_id: 'atencion_id',
                codigo_cie10: 'codigo_cie10',
                descripcion: 'descripcion',
                severidad: 'severidad'
            }
        }
    },
    defaults: {
        servicio: {
            servicio: 'Consulta General',
            tipo_servicio: 'Ambulatorio',
            area: 'General',
            nivel: 'Primario'
        },
        modalidad: 'Presencial',
        estado: 'Completado'
    },
    batchSizes: {
        dimension: 500,
        facts: 1000
    }
};

function sanitizeKey(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '_');
}

function buildCompositeId(sucursalNombre, sourceId) {
    if (sourceId === null || sourceId === undefined || sourceId === '') {
        return null;
    }
    const prefix = `${sanitizeKey(sucursalNombre)}-`;
    const rawId = String(sourceId);
    if (rawId.startsWith(prefix)) {
        return rawId;
    }
    return `${prefix}${rawId}`;
}

function parseLiteralValue(raw) {
    if (typeof raw !== 'string') {
        return { isLiteral: false, value: raw };
    }

    const trimmed = raw.trim();
    const lowered = trimmed.toLowerCase();

    if (lowered === 'null') return { isLiteral: true, value: null };
    if (lowered === 'true') return { isLiteral: true, value: true };
    if (lowered === 'false') return { isLiteral: true, value: false };
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { isLiteral: true, value: Number(trimmed) };

    return { isLiteral: false, value: raw };
}

function buildSelectQuery(mapping) {
    const literals = {};
    const selectParts = [];

    Object.entries(mapping.cols).forEach(([alias, sourceExpression]) => {
        const literal = parseLiteralValue(sourceExpression);
        if (literal.isLiteral) {
            literals[alias] = literal.value;
            return;
        }
        selectParts.push(`${sourceExpression} as "${alias}"`);
    });

    const query = `SELECT ${selectParts.join(', ')} FROM ${mapping.table}`;
    return { query, literals };
}

async function fetchMappedRows(sourcePool, mapping) {
    const { query, literals } = buildSelectQuery(mapping);
    const result = await sourcePool.query(query);

    if (Object.keys(literals).length === 0) {
        return result.rows;
    }

    return result.rows.map((row) => ({ ...literals, ...row }));
}

function getAge(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const date = new Date(fechaNacimiento);
    if (Number.isNaN(date.getTime())) return null;
    return new Date().getFullYear() - date.getFullYear();
}

async function batchInsert(pool, table, columns, values, conflictClause = '') {
    if (!values.length) return;

    const placeholders = values
        .map((_, rowIndex) => `(${columns.map((__, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(', ')})`)
        .join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} ${conflictClause}`;
    await pool.query(sql, values.flat());
}

async function ensureSucursal(dwPool, hospitalConfig) {
    const existing = await dwPool.query(
        'SELECT sucursal_sk FROM dim_sucursal WHERE nombre_hospital = $1',
        [hospitalConfig.nombre]
    );

    if (existing.rows.length) {
        return existing.rows[0].sucursal_sk;
    }

    const inserted = await dwPool.query(
        'INSERT INTO dim_sucursal (nombre_hospital, sistema_clinico) VALUES ($1, $2) RETURNING sucursal_sk',
        [hospitalConfig.nombre, hospitalConfig.sistema]
    );

    return inserted.rows[0].sucursal_sk;
}

async function syncDwSequences(dwPool) {
    const sequenceTargets = [
        { table: 'dim_tiempo', pk: 'tiempo_sk' },
        { table: 'dim_sucursal', pk: 'sucursal_sk' },
        { table: 'dim_paciente', pk: 'paciente_sk' },
        { table: 'dim_personal_medico', pk: 'personal_sk' },
        { table: 'dim_servicio', pk: 'servicio_sk' },
        { table: 'dim_diagnostico', pk: 'diagnostico_sk' },
        { table: 'dim_medicamento', pk: 'medicamento_sk' },
        { table: 'fact_atenciones', pk: 'atencion_sk' }
    ];

    for (const target of sequenceTargets) {
        const sql = `
            SELECT setval(
                pg_get_serial_sequence('${target.table}', '${target.pk}'),
                COALESCE((SELECT MAX(${target.pk}) FROM ${target.table}), 0) + 1,
                false
            )
        `;
        await dwPool.query(sql);
    }
}

async function ensureDimTiempo(dwPool, sourcePool, atencionesMap, batchSize) {
    const fechasQuery = `
        SELECT DISTINCT DATE(${atencionesMap.cols.fecha}) AS fecha
        FROM ${atencionesMap.table}
        WHERE ${atencionesMap.cols.fecha} IS NOT NULL
    `;

    const fechasResult = await sourcePool.query(fechasQuery);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const tiempoBatch = [];
    for (const row of fechasResult.rows) {
        if (!row.fecha) continue;

        const fecha = new Date(row.fecha);
        if (Number.isNaN(fecha.getTime())) continue;

        tiempoBatch.push([
            row.fecha,
            fecha.getFullYear(),
            fecha.getMonth() + 1,
            meses[fecha.getMonth()],
            Math.ceil((fecha.getMonth() + 1) / 3),
            fecha.getDate(),
            dias[fecha.getDay()],
            fecha.getDay() === 0 || fecha.getDay() === 6
        ]);

        if (tiempoBatch.length >= batchSize) {
            await batchInsert(
                dwPool,
                'dim_tiempo',
                ['fecha', 'anio', 'mes', 'nombre_mes', 'trimestre', 'dia', 'nombre_dia', 'es_fin_semana'],
                tiempoBatch,
                'ON CONFLICT (fecha) DO NOTHING'
            );
            tiempoBatch.length = 0;
        }
    }

    await batchInsert(
        dwPool,
        'dim_tiempo',
        ['fecha', 'anio', 'mes', 'nombre_mes', 'trimestre', 'dia', 'nombre_dia', 'es_fin_semana'],
        tiempoBatch,
        'ON CONFLICT (fecha) DO NOTHING'
    );
}

async function ensureDefaultService(dwPool, defaults = {}) {
    const servicio = defaults.servicio || 'Consulta General';
    const tipoServicio = defaults.tipo_servicio || 'Ambulatorio';
    const area = defaults.area || 'General';
    const nivel = defaults.nivel || 'Primario';

    const existing = await dwPool.query(
        `
        SELECT servicio_sk
        FROM dim_servicio
        WHERE servicio = $1 AND tipo_servicio = $2 AND area = $3 AND nivel = $4
        LIMIT 1
        `,
        [servicio, tipoServicio, area, nivel]
    );

    if (existing.rows.length) {
        return existing.rows[0].servicio_sk;
    }

    const inserted = await dwPool.query(
        `
        INSERT INTO dim_servicio (servicio, tipo_servicio, area, nivel)
        VALUES ($1, $2, $3, $4)
        RETURNING servicio_sk
        `,
        [servicio, tipoServicio, area, nivel]
    );

    return inserted.rows[0].servicio_sk;
}

async function loadPacientes(dwPool, sucursalSk, hospitalConfig, rows, batchSize) {
    const batch = [];

    for (const row of rows) {
        const idCompuesto = buildCompositeId(hospitalConfig.nombre, row.id_origen);
        batch.push([
            sucursalSk,
            idCompuesto,
            row.ci || null,
            row.nombre || null,
            row.genero || null,
            row.nacimiento || null,
            getAge(row.nacimiento)
        ]);

        if (batch.length >= batchSize) {
            await batchInsert(
                dwPool,
                'dim_paciente',
                ['sucursal_sk', 'paciente_id_origen', 'ci', 'nombre_completo', 'sexo', 'fecha_nacimiento', 'edad'],
                batch,
                'ON CONFLICT (sucursal_sk, paciente_id_origen) DO NOTHING'
            );
            batch.length = 0;
        }
    }

    await batchInsert(
        dwPool,
        'dim_paciente',
        ['sucursal_sk', 'paciente_id_origen', 'ci', 'nombre_completo', 'sexo', 'fecha_nacimiento', 'edad'],
        batch,
        'ON CONFLICT (sucursal_sk, paciente_id_origen) DO NOTHING'
    );
}

async function loadPersonal(dwPool, sucursalSk, hospitalConfig, rows, batchSize) {
    const batch = [];

    for (const row of rows) {
        const idCompuesto = buildCompositeId(hospitalConfig.nombre, row.id_origen);
        batch.push([
            sucursalSk,
            idCompuesto,
            row.nombre || null,
            row.especialidad || null,
            row.cargo || null
        ]);

        if (batch.length >= batchSize) {
            await batchInsert(
                dwPool,
                'dim_personal_medico',
                ['sucursal_sk', 'personal_id_origen', 'nombre_completo', 'especialidad', 'cargo'],
                batch,
                'ON CONFLICT (sucursal_sk, personal_id_origen) DO NOTHING'
            );
            batch.length = 0;
        }
    }

    await batchInsert(
        dwPool,
        'dim_personal_medico',
        ['sucursal_sk', 'personal_id_origen', 'nombre_completo', 'especialidad', 'cargo'],
        batch,
        'ON CONFLICT (sucursal_sk, personal_id_origen) DO NOTHING'
    );
}

async function loadDiagnosticos(dwPool, sucursalSk, hospitalConfig, rows, batchSize) {
    const uniqueById = new Set();
    const batch = [];

    for (const row of rows) {
        if (!row.id_origen) continue;
        const diagnosticoId = buildCompositeId(hospitalConfig.nombre, row.id_origen);
        if (!diagnosticoId || uniqueById.has(diagnosticoId)) continue;

        uniqueById.add(diagnosticoId);
        batch.push([
            sucursalSk,
            diagnosticoId,
            row.codigo_cie10 || 'SIN_CODIGO',
            row.descripcion || 'Sin descripción',
            row.severidad || 'Normal'
        ]);

        if (batch.length >= batchSize) {
            await batchInsert(
                dwPool,
                'dim_diagnostico',
                ['sucursal_sk', 'diagnostico_id_origen', 'codigo_cie10', 'diagnostico', 'tipo'],
                batch,
                'ON CONFLICT (sucursal_sk, diagnostico_id_origen) DO NOTHING'
            );
            batch.length = 0;
        }
    }

    await batchInsert(
        dwPool,
        'dim_diagnostico',
        ['sucursal_sk', 'diagnostico_id_origen', 'codigo_cie10', 'diagnostico', 'tipo'],
        batch,
        'ON CONFLICT (sucursal_sk, diagnostico_id_origen) DO NOTHING'
    );

    return uniqueById.size;
}

function buildDiagnosticosPorAtencion(diagnosticosRows, hospitalNombre) {
    const map = new Map();

    for (const row of diagnosticosRows) {
        const atencionCompuesta = buildCompositeId(hospitalNombre, row.atencion_id);
        if (!map.has(atencionCompuesta)) {
            map.set(atencionCompuesta, []);
        }

        map.get(atencionCompuesta).push({
            diagnostico_id_origen: buildCompositeId(hospitalNombre, row.id_origen),
            codigo_cie10: row.codigo_cie10,
            descripcion: row.descripcion,
            severidad: row.severidad
        });
    }

    return map;
}

async function buildDwCaches(dwPool, sucursalSk) {
    const [pacientesCache, personalCache, tiempoCache, diagnosticoCache] = await Promise.all([
        dwPool.query('SELECT paciente_id_origen, paciente_sk FROM dim_paciente WHERE sucursal_sk = $1', [sucursalSk]),
        dwPool.query('SELECT personal_id_origen, personal_sk FROM dim_personal_medico WHERE sucursal_sk = $1', [sucursalSk]),
        dwPool.query('SELECT fecha, tiempo_sk FROM dim_tiempo'),
        dwPool.query('SELECT diagnostico_id_origen, diagnostico_sk FROM dim_diagnostico WHERE sucursal_sk = $1', [sucursalSk])
    ]);

    return {
        pacienteMap: new Map(pacientesCache.rows.map((row) => [row.paciente_id_origen, row.paciente_sk])),
        personalMap: new Map(personalCache.rows.map((row) => [row.personal_id_origen, row.personal_sk])),
        tiempoMap: new Map(tiempoCache.rows.map((row) => [row.fecha.toISOString().split('T')[0], row.tiempo_sk])),
        diagnosticoMap: new Map(diagnosticoCache.rows.map((row) => [row.diagnostico_id_origen, row.diagnostico_sk]))
    };
}

async function getExistingFactIds(dwPool, sucursalSk) {
    const existing = await dwPool.query(
        'SELECT atencion_id_origen FROM fact_atenciones WHERE sucursal_sk = $1',
        [sucursalSk]
    );

    return new Set(existing.rows.map((row) => row.atencion_id_origen));
}

async function loadAtenciones({
    dwPool,
    sucursalSk,
    hospitalConfig,
    atencionesRows,
    diagnosticosPorAtencion,
    caches,
    servicioSk,
    batchSize
}) {
    const existingFactIds = await getExistingFactIds(dwPool, sucursalSk);
    const batch = [];

    let loaded = 0;
    let skippedDuplicates = 0;
    let skippedWithoutKeys = 0;

    for (const row of atencionesRows) {
        const atencionId = buildCompositeId(hospitalConfig.nombre, row.id_origen);

        if (existingFactIds.has(atencionId)) {
            skippedDuplicates += 1;
            continue;
        }

        const pacienteId = buildCompositeId(hospitalConfig.nombre, row.paciente_id);
        const personalId = buildCompositeId(hospitalConfig.nombre, row.medico_id);
        const fecha = row.fecha ? new Date(row.fecha).toISOString().split('T')[0] : null;

        const pacienteSk = caches.pacienteMap.get(pacienteId);
        const personalSk = caches.personalMap.get(personalId);
        const tiempoSk = caches.tiempoMap.get(fecha);

        if (!pacienteSk || !personalSk || !tiempoSk) {
            skippedWithoutKeys += 1;
            continue;
        }

        const diagnosticos = diagnosticosPorAtencion.get(atencionId) || [];
        const diagnosticoPrincipalSk = diagnosticos.length && diagnosticos[0].diagnostico_id_origen
            ? caches.diagnosticoMap.get(diagnosticos[0].diagnostico_id_origen) || null
            : null;

        const costo = row.costo || 0;

        batch.push([
            tiempoSk,
            pacienteSk,
            personalSk,
            servicioSk,
            sucursalSk,
            diagnosticoPrincipalSk,
            null,
            atencionId,
            row.motivo || hospitalConfig.defaults?.estado || 'Completado',
            hospitalConfig.defaults?.modalidad || 'Presencial',
            row.estado || hospitalConfig.defaults?.estado || 'Completado',
            diagnosticos.length,
            0,
            costo,
            0,
            costo,
            0,
            false,
            diagnosticos.length ? JSON.stringify(diagnosticos) : null,
            null
        ]);

        loaded += 1;
        existingFactIds.add(atencionId);

        if (batch.length >= batchSize) {
            await batchInsert(
                dwPool,
                'fact_atenciones',
                [
                    'tiempo_sk',
                    'paciente_sk',
                    'personal_sk',
                    'servicio_sk',
                    'sucursal_sk',
                    'diagnostico_principal_sk',
                    'medicamento_principal_sk',
                    'atencion_id_origen',
                    'tipo_atencion',
                    'modalidad',
                    'estado',
                    'cantidad_diagnosticos',
                    'cantidad_medicamentos',
                    'costo_total_bs',
                    'costo_medicamentos_bs',
                    'costo_servicio_bs',
                    'dias_internacion',
                    'reingreso_30d',
                    'diagnosticos_json',
                    'medicamentos_json'
                ],
                batch,
                'ON CONFLICT DO NOTHING'
            );
            batch.length = 0;
        }
    }

    await batchInsert(
        dwPool,
        'fact_atenciones',
        [
            'tiempo_sk',
            'paciente_sk',
            'personal_sk',
            'servicio_sk',
            'sucursal_sk',
            'diagnostico_principal_sk',
            'medicamento_principal_sk',
            'atencion_id_origen',
            'tipo_atencion',
            'modalidad',
            'estado',
            'cantidad_diagnosticos',
            'cantidad_medicamentos',
            'costo_total_bs',
            'costo_medicamentos_bs',
            'costo_servicio_bs',
            'dias_internacion',
            'reingreso_30d',
            'diagnosticos_json',
            'medicamentos_json'
        ],
        batch,
        'ON CONFLICT DO NOTHING'
    );

    return { loaded, skippedDuplicates, skippedWithoutKeys };
}

function getBatchSize(hospitalConfig, key, fallback) {
    return hospitalConfig.batchSizes?.[key] || fallback;
}

function validateHospitalConfig(hospitalConfig) {
    const requiredMappings = ['pacientes', 'medicos', 'atenciones', 'diagnosticos'];
    const missing = requiredMappings.filter((key) => !hospitalConfig.mappings?.[key]);
    if (missing.length) {
        throw new Error(`Faltan mappings requeridos: ${missing.join(', ')}`);
    }
}

async function runETL(hospitalConfig, options = {}) {
    validateHospitalConfig(hospitalConfig);

    const dwPool = options.dwPool || new Pool(dwConfig);
    const sourcePool = new Pool(hospitalConfig.sourceConfig);

    const dimensionBatch = getBatchSize(hospitalConfig, 'dimension', DEFAULT_BATCH_SIZE);
    const factBatch = getBatchSize(hospitalConfig, 'facts', FACT_BATCH_SIZE);

    console.log(`\n>>> Iniciando ETL para: ${hospitalConfig.nombre}`);

    try {
        const sucursalSk = await ensureSucursal(dwPool, hospitalConfig);

        console.log('- Sincronizando secuencias del DW...');
        await syncDwSequences(dwPool);

        console.log('- Verificando dimensión tiempo...');
        await ensureDimTiempo(dwPool, sourcePool, hospitalConfig.mappings.atenciones, dimensionBatch);

        console.log('- Verificando servicio por defecto...');
        const servicioSk = await ensureDefaultService(dwPool, hospitalConfig.defaults?.servicio);

        console.log('- Extrayendo datos del origen...');
        const [pacientesRows, personalRows, atencionesRows, diagnosticosRows] = await Promise.all([
            fetchMappedRows(sourcePool, hospitalConfig.mappings.pacientes),
            fetchMappedRows(sourcePool, hospitalConfig.mappings.medicos),
            fetchMappedRows(sourcePool, hospitalConfig.mappings.atenciones),
            fetchMappedRows(sourcePool, hospitalConfig.mappings.diagnosticos)
        ]);

        console.log('- Cargando pacientes...');
        await loadPacientes(dwPool, sucursalSk, hospitalConfig, pacientesRows, dimensionBatch);

        console.log('- Cargando personal médico...');
        await loadPersonal(dwPool, sucursalSk, hospitalConfig, personalRows, dimensionBatch);

        console.log('- Cargando diagnósticos...');
        const diagnosticosCargados = await loadDiagnosticos(dwPool, sucursalSk, hospitalConfig, diagnosticosRows, dimensionBatch);

        console.log('- Construyendo cache DW...');
        const caches = await buildDwCaches(dwPool, sucursalSk);

        console.log('- Mapeando diagnósticos por atención...');
        const diagnosticosPorAtencion = buildDiagnosticosPorAtencion(diagnosticosRows, hospitalConfig.nombre);

        console.log('- Cargando hechos de atenciones...');
        const factResult = await loadAtenciones({
            dwPool,
            sucursalSk,
            hospitalConfig,
            atencionesRows,
            diagnosticosPorAtencion,
            caches,
            servicioSk,
            batchSize: factBatch
        });

        console.log('✅ ETL completado:');
        console.log(`   - Pacientes origen: ${pacientesRows.length}`);
        console.log(`   - Personal origen: ${personalRows.length}`);
        console.log(`   - Diagnósticos cargados: ${diagnosticosCargados}`);
        console.log(`   - Atenciones cargadas: ${factResult.loaded}`);
        console.log(`   - Atenciones duplicadas: ${factResult.skippedDuplicates}`);
        console.log(`   - Atenciones sin llaves DW: ${factResult.skippedWithoutKeys}`);

        return {
            sucursalSk,
            pacientes: pacientesRows.length,
            personal: personalRows.length,
            diagnosticosCargados,
            ...factResult
        };
    } finally {
        await sourcePool.end();
        if (!options.dwPool) {
            await dwPool.end();
        }
    }
}

if (require.main === module) {
    runETL(grupo1)
        .then(() => {
            console.log('Proceso finalizado.');
        })
        .catch((err) => {
            console.error('❌ Error fatal:', err.message);
            process.exitCode = 1;
        });
}

module.exports = {
    runETL,
    grupo1,
    buildCompositeId,
    buildSelectQuery,
    batchInsert
};
