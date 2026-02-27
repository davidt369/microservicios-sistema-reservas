-- ============================================
-- DATA WAREHOUSE CLINICO REDUCIDO
-- 6 DIMENSIONES + 1 TABLA DE HECHOS
-- PostgreSQL
-- ============================================

-- ============================================
-- LIMPIEZA
-- ============================================
DROP TABLE IF EXISTS fact_atenciones CASCADE;
DROP TABLE IF EXISTS dim_sucursal CASCADE;
DROP TABLE IF EXISTS dim_medicamento CASCADE;
DROP TABLE IF EXISTS dim_diagnostico CASCADE;
DROP TABLE IF EXISTS dim_servicio CASCADE;
DROP TABLE IF EXISTS dim_personal_medico CASCADE;
DROP TABLE IF EXISTS dim_paciente CASCADE;
DROP TABLE IF EXISTS dim_tiempo CASCADE;

-- ============================================
-- DIMENSION TIEMPO
-- ============================================
CREATE TABLE dim_tiempo (
    tiempo_sk SERIAL PRIMARY KEY,
    fecha DATE UNIQUE NOT NULL,
    anio INT NOT NULL,
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    nombre_mes VARCHAR(15),
    trimestre INT CHECK (trimestre BETWEEN 1 AND 4),
    dia INT CHECK (dia BETWEEN 1 AND 31),
    nombre_dia VARCHAR(15),
    es_fin_semana BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- DIMENSION SUCURSAL (HOSPITAL ORIGEN)
-- ============================================
CREATE TABLE dim_sucursal (
    sucursal_sk SERIAL PRIMARY KEY,
    nombre_hospital VARCHAR(150) UNIQUE NOT NULL,
    host TEXT,
    puerto INT DEFAULT 5432,
    base_datos VARCHAR(100),
    usuario VARCHAR(100),
    password TEXT,
    ubicacion TEXT,
    sistema_clinico VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- DIMENSION PACIENTE
-- ============================================
CREATE TABLE dim_paciente (
    paciente_sk SERIAL PRIMARY KEY,
    sucursal_sk INT NOT NULL,
    paciente_id_origen VARCHAR(100) NOT NULL,
    ci VARCHAR(15),
    nombre_completo VARCHAR(150),
    sexo VARCHAR(10),
    fecha_nacimiento DATE,
    edad INT,
    grupo_etario VARCHAR(20),
    departamento VARCHAR(50),
    provincia VARCHAR(50),
    municipio VARCHAR(50),
    zona VARCHAR(50),
    direccion TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_paciente_origen UNIQUE (sucursal_sk, paciente_id_origen),
    CONSTRAINT fk_paciente_sucursal FOREIGN KEY (sucursal_sk)
        REFERENCES dim_sucursal(sucursal_sk) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================
-- DIMENSION PERSONAL MEDICO
-- ============================================
CREATE TABLE dim_personal_medico (
    personal_sk SERIAL PRIMARY KEY,
    sucursal_sk INT NOT NULL,
    personal_id_origen VARCHAR(100) NOT NULL,
    nombre_completo VARCHAR(150),
    especialidad VARCHAR(100),
    cargo VARCHAR(50),
    nivel_atencion VARCHAR(20),
    colegiatura VARCHAR(50),
    anos_experiencia INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_personal_origen UNIQUE (sucursal_sk, personal_id_origen),
    CONSTRAINT fk_personal_sucursal FOREIGN KEY (sucursal_sk)
        REFERENCES dim_sucursal(sucursal_sk) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================
-- DIMENSION SERVICIO
-- ============================================
CREATE TABLE dim_servicio (
    servicio_sk SERIAL PRIMARY KEY,
    servicio VARCHAR(100) NOT NULL,
    tipo_servicio VARCHAR(50),
    area VARCHAR(50),
    nivel VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_servicio UNIQUE (servicio, tipo_servicio, area, nivel)
);

-- ============================================
-- DIMENSION DIAGNOSTICO
-- ============================================
CREATE TABLE dim_diagnostico (
    diagnostico_sk SERIAL PRIMARY KEY,
    sucursal_sk INT NOT NULL,
    diagnostico_id_origen VARCHAR(100) NOT NULL,
    codigo_cie10 VARCHAR(20) NOT NULL,
    diagnostico VARCHAR(255),
    categoria_cie10 VARCHAR(100),
    grupo_enfermedad VARCHAR(100),
    tipo VARCHAR(50),
    es_transmisible BOOLEAN,
    es_cronico BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_diagnostico_origen UNIQUE (sucursal_sk, diagnostico_id_origen),
    CONSTRAINT fk_diagnostico_sucursal FOREIGN KEY (sucursal_sk)
        REFERENCES dim_sucursal(sucursal_sk) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================
-- DIMENSION MEDICAMENTO
-- ============================================
CREATE TABLE dim_medicamento (
    medicamento_sk SERIAL PRIMARY KEY,
    codigo_atc VARCHAR(10) UNIQUE,
    medicamento VARCHAR(255),
    principio_activo VARCHAR(255),
    grupo_farmacologico VARCHAR(100),
    forma_farmaceutica VARCHAR(50),
    concentracion VARCHAR(50),
    via_administracion VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA DE HECHOS ATENCIONES
-- ============================================
CREATE TABLE fact_atenciones (
    atencion_sk BIGSERIAL PRIMARY KEY,

    tiempo_sk INT NOT NULL,
    paciente_sk INT NOT NULL,
    personal_sk INT NOT NULL,
    servicio_sk INT NOT NULL,
    sucursal_sk INT NOT NULL,

    diagnostico_principal_sk INT,
    medicamento_principal_sk INT,

    atencion_id_origen VARCHAR(100) NOT NULL,

    tipo_atencion VARCHAR(50),
    modalidad VARCHAR(50),
    estado VARCHAR(30),

    cantidad_diagnosticos INT,
    cantidad_medicamentos INT,

    costo_total_bs NUMERIC(12,2),
    costo_medicamentos_bs NUMERIC(12,2),
    costo_servicio_bs NUMERIC(12,2),

    dias_internacion INT,
    reingreso_30d BOOLEAN,

    diagnosticos_json JSONB,
    medicamentos_json JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_fact_origen UNIQUE (sucursal_sk, atencion_id_origen),

    CONSTRAINT fk_tiempo
        FOREIGN KEY (tiempo_sk) REFERENCES dim_tiempo(tiempo_sk)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_paciente
        FOREIGN KEY (paciente_sk) REFERENCES dim_paciente(paciente_sk)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_personal
        FOREIGN KEY (personal_sk) REFERENCES dim_personal_medico(personal_sk)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_servicio
        FOREIGN KEY (servicio_sk) REFERENCES dim_servicio(servicio_sk)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_sucursal
        FOREIGN KEY (sucursal_sk) REFERENCES dim_sucursal(sucursal_sk)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_diag
        FOREIGN KEY (diagnostico_principal_sk) REFERENCES dim_diagnostico(diagnostico_sk)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_med
        FOREIGN KEY (medicamento_principal_sk) REFERENCES dim_medicamento(medicamento_sk)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================
-- INDICES DW
-- ============================================
CREATE INDEX idx_fact_tiempo ON fact_atenciones(tiempo_sk);
CREATE INDEX idx_fact_paciente ON fact_atenciones(paciente_sk);
CREATE INDEX idx_fact_personal ON fact_atenciones(personal_sk);
CREATE INDEX idx_fact_servicio ON fact_atenciones(servicio_sk);
CREATE INDEX idx_fact_sucursal ON fact_atenciones(sucursal_sk);
CREATE INDEX idx_fact_diag ON fact_atenciones(diagnostico_principal_sk);
CREATE INDEX idx_fact_med ON fact_atenciones(medicamento_principal_sk);

-- ============================================
-- FIN DW
-- ============================================
