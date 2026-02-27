/* eslint-disable no-await-in-loop */
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const { Client } = require('pg');
const copyFrom = require('pg-copy-streams').from;

// Configuración de volúmenes (300,000 por tabla como pidió el usuario)
const NUM_PACIENTES = parseInt(process.env.NUM_PACIENTES || '300000', 10);
const NUM_PERSONAL = parseInt(process.env.NUM_PERSONAL || '300000', 10);
const NUM_SERVICIOS = parseInt(process.env.NUM_SERVICIOS || '300000', 10);
const NUM_DIAGNOSTICOS = parseInt(process.env.NUM_DIAGNOSTICOS || '300000', 10);
const NUM_MEDICAMENTOS = parseInt(process.env.NUM_MEDICAMENTOS || '300000', 10);
const NUM_ATENCIONES = parseInt(process.env.NUM_ATENCIONES || '300000', 10);

const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_jr5fHxYAJU2S@ep-orange-sun-aiyh4lhb-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Listas de contexto Bolivia expandidas
const boliviaInfo = {
  departamentos: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando'],
  provincias: {
    'La Paz': ['Murillo', 'Larecaja', 'Ingavi', 'Sud Yungas', 'Pacajes', 'Omasuyos', 'Los Andes'],
    'Santa Cruz': ['Andrés Ibáñez', 'Warnes', 'Velasco', 'Chiquitos', 'Cordillera', 'Ichilo', 'Sara'],
    'Cochabamba': ['Cercado', 'Quillacollo', 'Chapare', 'Punata', 'Tiraque', 'Carrasco', 'Mizque'],
    'Oruro': ['Cercado', 'Abaroa', 'Carangas', 'Dalence', 'Sajama'],
    'Potosí': ['Tomás Frías', 'Chayanta', 'Cornelio Saavedra', 'Linares', 'Sur Chichas'],
    'Chuquisaca': ['Oropeza', 'Azurduy', 'Zudáñez', 'Yamparáez', 'Tomina'],
    'Tarija': ['Cercado', 'Arce', 'Gran Chaco', 'Avilés', 'Méndez'],
    'Beni': ['Cercado', 'Vaca Díez', 'Ballivián', 'Yacuma', 'Moxos'],
    'Pando': ['Nicolás Suárez', 'Abuná', 'Federico Román', 'Manuripi', 'Madre de Dios']
  },
  municipios: {
    'Murillo': ['La Paz', 'El Alto', 'Viacha', 'Achocalla'],
    'Andrés Ibáñez': ['Santa Cruz de la Sierra', 'Cotoca', 'El Torno', 'La Guardia', 'Porongo'],
    'Cercado': ['Cochabamba', 'Oruro', 'Tarija', 'Trinidad'],
    'Quillacollo': ['Quillacollo', 'Vinto', 'Colcapirhua']
  },
  zonas: ['Sopocachi', 'Equipetrol', 'Cala Cala', 'Miraflores', 'Achumani', 'Villa Fátima', 'Plan 3000', 'Villa 1 de Mayo', 'Los Lotes', 'San Pedro', 'Obrajes', 'Calacoto', 'Sarco', 'Queru Queru'],
  calles: ['Av. Blanco Galindo', 'Av. Villazón', 'Av. Juan Pablo II', 'Calle Linares', 'Calle Sucre', 'Av. 6 de Agosto', 'Av. Beni', 'Av. Roca y Coronado', 'Av. Panamericana', 'Barrio Minero San José', 'Zona Sur', 'Calle Bolivar'],
  servicios: [
    { s: 'Consulta Externa', t: 'Ambulatorio', a: 'Medicina General', n: 'I Nivel' },
    { s: 'Emergencias', t: 'Emergencia', a: 'Hospitalización', n: 'II Nivel' },
    { s: 'Pediatría', t: 'Hospitalario', a: 'Clínico', n: 'III Nivel' },
    { s: 'Cirugía General', t: 'Quirúrgico', a: 'Quirófano', n: 'III Nivel' },
    { s: 'Traumatología', t: 'Hospitalario', a: 'Especialidades', n: 'III Nivel' },
    { s: 'Ginecología y Obstetricia', t: 'Hospitalario', a: 'Maternidad', n: 'III Nivel' },
    { s: 'Unidad de Cuidados Intensivos', t: 'Hospitalario', a: 'Crítica', n: 'III Nivel' },
    { s: 'Cardiología', t: 'Ambulatorio', a: 'Especialidades', n: 'III Nivel' },
    { s: 'Laboratorio Clínico', t: 'Apoyo', a: 'Diagnóstico', n: 'II Nivel' },
    { s: 'Imagenología', t: 'Apoyo', a: 'Diagnóstico', n: 'II Nivel' }
  ],
  especialidades: ['Medicina General', 'Pediatría', 'Ginecología y Obstetricia', 'Cardiología', 'Traumatología', 'Neurología', 'Medicina Interna', 'Cirugía General', 'Anestesiología', 'Urología', 'Endocrinología', 'Dermatología', 'Oftalmología'],
  cargos: ['Médico Especialista', 'Médico General', 'Médico Residente', 'Enfermera Jefe', 'Enfermera', 'Técnico Sanitario', 'Cirujano'],
  cie10: [
    { cod: 'J18.9', diag: 'Neumonía no especificada', cat: 'Enfermedades respiratorias', grupo: 'Respiratorio', trans: true, cron: false, tipo: 'Agudo' },
    { cod: 'E11.9', diag: 'Diabetes mellitus tipo 2 sin complicaciones', cat: 'Endocrinas', grupo: 'Metabólico', trans: false, cron: true, tipo: 'Crónico' },
    { cod: 'I10', diag: 'Hipertensión esencial', cat: 'Cardiovasculares', grupo: 'Cardiovascular', trans: false, cron: true, tipo: 'Crónico' },
    { cod: 'A09', diag: 'Diarrea y gastroenteritis infecciosa', cat: 'Infecciosas intestinales', grupo: 'Digestivo', trans: true, cron: false, tipo: 'Agudo' },
    { cod: 'S82.2', diag: 'Fractura de tibia', cat: 'Traumatismos', grupo: 'Lesiones', trans: false, cron: false, tipo: 'Agudo' },
    { cod: 'O80', diag: 'Parto único espontáneo', cat: 'Embarazo y parto', grupo: 'Obstétrico', trans: false, cron: false, tipo: 'Evento' },
    { cod: 'J45.9', diag: 'Asma no especificada', cat: 'Respiratorio', grupo: 'Respiratorio', trans: false, cron: true, tipo: 'Crónico' },
    { cod: 'K29.7', diag: 'Gastritis, no especificada', cat: 'Enfermedades digestivas', grupo: 'Digestivo', trans: false, cron: false, tipo: 'Agudo' },
    { cod: 'N39.0', diag: 'Infección de vías urinarias', cat: 'Enfermedades genitourinarias', grupo: 'Urinario', trans: true, cron: false, tipo: 'Agudo' }
  ],
  atc: [
    { cod: 'J01CA04', med: 'Amoxicilina 500 mg', p: 'Amoxicilina', grupo: 'Antibiótico penicilina', forma: 'Tableta', conc: '500 mg', via: 'Oral' },
    { cod: 'A10BA02', med: 'Metformina 850 mg', p: 'Metformina', grupo: 'Antidiabético', forma: 'Tableta', conc: '850 mg', via: 'Oral' },
    { cod: 'C09AA05', med: 'Enalapril 20 mg', p: 'Enalapril', grupo: 'Antihipertensivo IECA', forma: 'Tableta', conc: '20 mg', via: 'Oral' },
    { cod: 'N02BE01', med: 'Paracetamol 500 mg', p: 'Paracetamol', grupo: 'Analgésico', forma: 'Tableta', conc: '500 mg', via: 'Oral' },
    { cod: 'R03AK06', med: 'Salbutamol inhalador', p: 'Salbutamol', grupo: 'Broncodilatador', forma: 'Inhalador', conc: '100 mcg', via: 'Inhalatoria' },
    { cod: 'B01AC06', med: 'Ácido acetilsalicílico', p: 'Aspirina', grupo: 'Antiagregante', forma: 'Tableta', conc: '100 mg', via: 'Oral' },
    { cod: 'M01AE01', med: 'Ibuprofeno 400 mg', p: 'Ibuprofeno', grupo: 'Antiinflamatorio', forma: 'Tableta', conc: '400 mg', via: 'Oral' },
    { cod: 'A02BC01', med: 'Omeprazol 20 mg', p: 'Omeprazol', grupo: 'Antiácido', forma: 'Cápsula', conc: '20 mg', via: 'Oral' }
  ],
  nombres: ['Juan', 'José', 'Luis', 'Carlos', 'María', 'Ana', 'Carmen', 'Laura', 'Fernando', 'Javier', 'Pedro', 'Rosa', 'Daniela', 'Marcos', 'Jorge', 'Patricia', 'Silvia', 'Raúl', 'Hugo', 'Martha'],
  apellidos: ['Quispe', 'Mamani', 'Choque', 'Condori', 'Vargas', 'Flores', 'Vaca', 'Pinto', 'Rojas', 'Mendoza', 'Aguilar', 'Nina', 'Salvatierra', 'Gutiérrez', 'Mercado', 'Arce', 'Pérez', 'Rocha', 'Zárate', 'Ticona']
};

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('--- Iniciando Carga Masiva DW Bolivia (300k por tabla) ---');
  console.log(`Configuración: ${NUM_ATENCIONES} atenciones en ${NUM_PACIENTES} pacientes...`);

  // Ejecutar Schema
  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'db_star.sql'), 'utf8');
  await client.query(schemaSql);
  console.log('✔ Esquema creado (con DROP previo).');

  // Insertar sucursal por defecto para el DW principal
  await client.query(`
    INSERT INTO dim_sucursal (nombre_hospital, host, ubicacion, sistema_clinico, activo)
    VALUES ('DW Central Bolivia', 'localhost', 'Data Warehouse Principal', 'Sistema Generado', true)
  `);
  console.log('✔ Sucursal por defecto creada.');

  async function copyCSV(filename, table, columns) {
    const stream = client.query(copyFrom(`COPY ${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv)`));
    const fileStream = fs.createReadStream(path.join(TMP_DIR, filename));
    await pipelineAsync(fileStream, stream);
    console.log(`  ✔ Inserción masiva en ${table} completada.`);
  }

  // 1. dim_tiempo (2015-2026)
  console.log('Generando dim_tiempo...');
  const tiempoFile = path.join(TMP_DIR, 'dim_tiempo.csv');
  await new Promise((resolve) => {
    const tStream = fs.createWriteStream(tiempoFile);
    const start = new Date('2015-01-01');
    const end = new Date('2026-12-31');
    let t_sk = 1;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const row = [
        t_sk++, d.toISOString().split('T')[0], d.getFullYear(), d.getMonth() + 1,
        `"${d.toLocaleString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + d.toLocaleString('es-ES', { month: 'long' }).slice(1)}"`, 
        Math.floor(d.getMonth() / 3) + 1,
        d.getDate(), `"${d.toLocaleString('es-ES', { weekday: 'long' }).charAt(0).toUpperCase() + d.toLocaleString('es-ES', { weekday: 'long' }).slice(1)}"`,
        (d.getDay() === 0 || d.getDay() === 6) ? 't' : 'f'
      ].join(',') + '\n';
      tStream.write(row);
    }
    tStream.end();
    tStream.on('finish', resolve);
  });
  await copyCSV('dim_tiempo.csv', 'dim_tiempo', ['tiempo_sk', 'fecha', 'anio', 'mes', 'nombre_mes', 'trimestre', 'dia', 'nombre_dia', 'es_fin_semana']);
  const totalDias = 4383; // Aprox para 2015-2026 (12 años aprox)

  // 2. dim_paciente
  console.log('Generando dim_paciente...');
  const pacFile = path.join(TMP_DIR, 'dim_paciente.csv');
  await new Promise((resolve) => {
    const pacStream = fs.createWriteStream(pacFile);
    for (let i = 1; i <= NUM_PACIENTES; i++) {
        const dep = sample(boliviaInfo.departamentos);
        const prov = sample(boliviaInfo.provincias[dep]);
        const mun = (boliviaInfo.municipios[prov] && sample(boliviaInfo.municipios[prov])) || prov;
        const nac = new Date(randInt(1940, 2024), randInt(0, 11), randInt(1, 28));
        const edad = new Date().getFullYear() - nac.getFullYear();
        const sexo = sample(['Masculino', 'Femenino']);
        const row = [
        i, 1, i, `"${randInt(1000000, 9999999)}-${dep.substring(0,2).toUpperCase()}"`, 
        `"${sample(boliviaInfo.nombres)} ${sample(boliviaInfo.nombres)} ${sample(boliviaInfo.apellidos)} ${sample(boliviaInfo.apellidos)}"`,
        `"${sexo}"`, nac.toISOString().split('T')[0], edad,
        edad < 1 ? 'Infante' : (edad < 12 ? 'Niño' : (edad < 18 ? 'Adolescente' : (edad < 25 ? 'Joven' : (edad < 60 ? 'Adulto' : 'Adulto Mayor')))),
        `"${dep}"`, `"${prov}"`, `"${mun}"`, `"${sample(boliviaInfo.zonas)}"`, `"${sample(boliviaInfo.calles)} ${randInt(1, 500)}"`
        ].join(',') + '\n';
        pacStream.write(row);
        if (i % 50000 === 0) process.stdout.write('.');
    }
    pacStream.end();
    pacStream.on('finish', resolve);
  });
  await copyCSV('dim_paciente.csv', 'dim_paciente', ['paciente_sk', 'sucursal_sk', 'paciente_id_origen', 'ci', 'nombre_completo', 'sexo', 'fecha_nacimiento', 'edad', 'grupo_etario', 'departamento', 'provincia', 'municipio', 'zona', 'direccion']);

  // 3. dim_personal_medico
  console.log('\nGenerando dim_personal_medico...');
  const perFile = path.join(TMP_DIR, 'dim_personal_medico.csv');
  await new Promise((resolve) => {
    const perStream = fs.createWriteStream(perFile);
    for (let i = 1; i <= NUM_PERSONAL; i++) {
        const depAbbr = sample(['LP', 'SC', 'CB', 'OR', 'PO', 'CH', 'TJ', 'BE', 'PA']);
        const cargo = sample(boliviaInfo.cargos);
        const prefix = cargo.includes('Médico') || cargo.includes('Cirujano') ? (Math.random() > 0.5 ? 'Dr. ' : 'Dra. ') : 'Lic. ';
        const row = [
        i, 1, i, `"${prefix}${sample(boliviaInfo.nombres)} ${sample(boliviaInfo.apellidos)} ${sample(boliviaInfo.apellidos)}"`,
        `"${sample(boliviaInfo.especialidades)}"`, `"${cargo}"`, `"${sample(['I Nivel', 'II Nivel', 'III Nivel'])}"`,
        `"COLMED-${depAbbr}-${randInt(1000, 9999)}"`, randInt(1, 40)
        ].join(',') + '\n';
        perStream.write(row);
    }
    perStream.end();
    perStream.on('finish', resolve);
  });
  await copyCSV('dim_personal_medico.csv', 'dim_personal_medico', ['personal_sk', 'sucursal_sk', 'personal_id_origen', 'nombre_completo', 'especialidad', 'cargo', 'nivel_atencion', 'colegiatura', 'anos_experiencia']);

  // 4. dim_servicio
  console.log('Generando dim_servicio...');
  const svcFile = path.join(TMP_DIR, 'dim_servicio.csv');
  await new Promise((resolve) => {
    const svcStream = fs.createWriteStream(svcFile);
    for (let i = 1; i <= NUM_SERVICIOS; i++) {
        const base = sample(boliviaInfo.servicios);
        const variacion = ['A', 'B', 'C', 'Norte', 'Sur', 'Sala ' + (i % 100 + 1)][i % 6];
        const row = [
        i, `"${base.s} - ${variacion}"`, `"${base.t}"`, `"${base.a}"`, `"${base.n}"`
        ].join(',') + '\n';
        svcStream.write(row);
    }
    svcStream.end();
    svcStream.on('finish', resolve);
  });
  await copyCSV('dim_servicio.csv', 'dim_servicio', ['servicio_sk', 'servicio', 'tipo_servicio', 'area', 'nivel']);

  // 5. dim_diagnostico
  console.log('Generando dim_diagnostico...');
  const diagFile = path.join(TMP_DIR, 'dim_diagnostico.csv');
  await new Promise((resolve) => {
    const dgStream = fs.createWriteStream(diagFile);
    for (let i = 1; i <= NUM_DIAGNOSTICOS; i++) {
        const base = sample(boliviaInfo.cie10);
        // Generar código único usando el índice directamente
        const codigoUnico = `${base.cod}-${String(i).padStart(6, '0')}`;
        const row = [
        i, `"${codigoUnico}"`, `"${base.diag} (Caso ${i})"`, `"${base.cat}"`, `"${base.grupo}"`, `"${base.tipo}"`,
        base.trans ? 't' : 'f', base.cron ? 't' : 'f'
        ].join(',') + '\n';
        dgStream.write(row);
        if (i % 50000 === 0) process.stdout.write('.');
    }
    dgStream.end();
    dgStream.on('finish', resolve);
  });
  await copyCSV('dim_diagnostico.csv', 'dim_diagnostico', ['diagnostico_sk', 'codigo_cie10', 'diagnostico', 'categoria_cie10', 'grupo_enfermedad', 'tipo', 'es_transmisible', 'es_cronico']);

  // 6. dim_medicamento
  console.log('Generando dim_medicamento...');
  const medFile = path.join(TMP_DIR, 'dim_medicamento.csv');
  await new Promise((resolve) => {
    const mStream = fs.createWriteStream(medFile);
    for (let i = 1; i <= NUM_MEDICAMENTOS; i++) {
        const base = sample(boliviaInfo.atc);
        const variacion = (i % 500);
        const row = [
        i, `"${base.cod}"`, `"${base.med} (Lote ${variacion})"`, `"${base.p}"`, `"${base.grupo}"`, `"${base.forma}"`, `"${base.conc}"`, `"${base.via}"`
        ].join(',') + '\n';
        mStream.write(row);
    }
    mStream.end();
    mStream.on('finish', resolve);
  });
  await copyCSV('dim_medicamento.csv', 'dim_medicamento', ['medicamento_sk', 'codigo_atc', 'medicamento', 'principio_activo', 'grupo_farmacologico', 'forma_farmaceutica', 'concentracion', 'via_administracion']);

  // 7. fact_atenciones
  console.log('Generando fact_atenciones...');
  const factFile = path.join(TMP_DIR, 'fact_atenciones.csv');
  await new Promise((resolve) => {
    const fStream = fs.createWriteStream(factFile);
    for (let i = 1; i <= NUM_ATENCIONES; i++) {
        const costoS = randInt(50, 5000);
        const costoM = randInt(10, 2000);
        const d_sk = randInt(1, NUM_DIAGNOSTICOS);
        const m_sk = randInt(1, NUM_MEDICAMENTOS);
        const row = [
        i, randInt(1, totalDias), randInt(1, NUM_PACIENTES), randInt(1, NUM_PERSONAL), randInt(1, NUM_SERVICIOS),
        1, d_sk, m_sk, i,
        `"${sample(['Emergencia', 'Consulta', 'Control', 'Cirugía', 'Parto'])}"`, `"${sample(['Presencial', 'Telesalud', 'Hospitalización'])}"`, `"${sample(['Alta', 'Control', 'Finalizado', 'Pendiente'])}"`,
        randInt(1, 3), randInt(1, 5), (costoS + costoM).toFixed(2), costoM.toFixed(2), costoS.toFixed(2),
        randInt(0, 15), Math.random() < 0.05 ? 't' : 'f',
        `"[ {""cie10"": ""CIE-${d_sk}""} ]"`, `"[ {""med"": ""MED-${m_sk}""} ]"`
        ].join(',') + '\n';
        fStream.write(row);
        if (i % 50000 === 0) process.stdout.write('.');
    }
    fStream.end();
    fStream.on('finish', resolve);
  });
  await copyCSV('fact_atenciones.csv', 'fact_atenciones', [
    'atencion_sk', 'tiempo_sk', 'paciente_sk', 'personal_sk', 'servicio_sk',
    'sucursal_sk', 'diagnostico_principal_sk', 'medicamento_principal_sk', 'atencion_id_origen', 'tipo_atencion', 'modalidad', 'estado',
    'cantidad_diagnosticos', 'cantidad_medicamentos', 'costo_total_bs', 'costo_medicamentos_bs', 'costo_servicio_bs',
    'dias_internacion', 'reingreso_30d', 'diagnosticos_json', 'medicamentos_json'
  ]);


  console.log('\n✔ Carga finalizada con éxito.');
  await client.end();
}

run().catch(e => { console.error('❌ Error fatal:', e); process.exit(1); });
