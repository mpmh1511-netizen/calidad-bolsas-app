import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar que la carpeta database y uploads existan
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'calidad_bolsas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite:', dbPath);
    initDb();
  }
});

// Enlazar claves foráneas en SQLite
db.run("PRAGMA foreign_keys = ON;");

function initDb() {
  db.serialize(() => {
    // 1. Tabla de bobinas
    db.run(`
      CREATE TABLE IF NOT EXISTS bobinas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_rollo TEXT NOT NULL,
        marca_especificaciones TEXT NOT NULL,
        ancho_bobina REAL NOT NULL,
        gramaje INTEGER NOT NULL,
        fecha_produccion_bobina DATE NOT NULL,
        porcentaje_humedad REAL NOT NULL,
        estado_bobina TEXT NOT NULL DEFAULT 'Sin Imprimir',
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migraciones para bobinas
    db.run(`ALTER TABLE bobinas ADD COLUMN estado_bobina TEXT NOT NULL DEFAULT 'Sin Imprimir'`, () => {});
    db.run(`UPDATE bobinas SET estado_bobina = 'Sin Imprimir' WHERE estado_bobina = 'Almacén' OR estado_bobina IS NULL`, () => {});

    // 2. Tabla de inspecciones
    db.run(`
      CREATE TABLE IF NOT EXISTS inspecciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bobina_id INTEGER NOT NULL,
        area TEXT CHECK(area IN ('Flexo', 'Nanjang', 'Con Asa')) NOT NULL,
        maquina TEXT NOT NULL,
        hora_inspeccion TEXT NOT NULL,
        operador TEXT NOT NULL,
        tiene_print_card INTEGER CHECK(tiene_print_card IN (0, 1)) NOT NULL,
        resultado TEXT CHECK(resultado IN ('Aprobado', 'Rechazado')) NOT NULL,
        observaciones TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bobina_id) REFERENCES bobinas(id) ON DELETE CASCADE
      );
    `);

    // 3. Tabla de detalles Flexo
    db.run(`
      CREATE TABLE IF NOT EXISTS inspecciones_flexo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspeccion_id INTEGER NOT NULL UNIQUE,
        numero_tintas INTEGER NOT NULL,
        impresion_correcta INTEGER CHECK(impresion_correcta IN (0, 1)) NOT NULL,
        registro_correcto INTEGER CHECK(registro_correcto IN (0, 1)) NOT NULL,
        estado_fisico_rollo TEXT CHECK(estado_fisico_rollo IN ('Buenas condiciones', 'Malas condiciones')) NOT NULL,
        ultimo_lavado_grabado TEXT NOT NULL,
        FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
      );
    `);

    // 4. Tabla de detalles bolsas (Nanjang y Con Asa)
    db.run(`
      CREATE TABLE IF NOT EXISTS inspecciones_bolsas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspeccion_id INTEGER NOT NULL UNIQUE,
        pegado_disco INTEGER CHECK(pegado_disco IN (0, 1)) NOT NULL,
        pegado_fondo INTEGER CHECK(pegado_fondo IN (0, 1)) NOT NULL,
        sin_rebabas_pegamento INTEGER CHECK(sin_rebabas_pegamento IN (0, 1)) NOT NULL,
        sin_ruptura_papel INTEGER CHECK(sin_ruptura_papel IN (0, 1)) NOT NULL,
        medidas_coinciden INTEGER CHECK(medidas_coinciden IN (0, 1)) NOT NULL,
        estado_gomas_fondo TEXT CHECK(estado_gomas_fondo IN ('Buenas condiciones', 'Malas condiciones')) NOT NULL,
        velocidad_trabajo REAL NOT NULL,
        cantidad_revisada INTEGER NOT NULL,
        pegamiento_suficiente_asa INTEGER CHECK(pegamiento_suficiente_asa IN (0, 1, NULL)),
        pegamiento_suficiente_parche INTEGER CHECK(pegamiento_suficiente_parche IN (0, 1, NULL)),
        posicion_asa_correcta INTEGER CHECK(posicion_asa_correcta IN (0, 1, NULL)),
        temperatura_pegamento REAL,
        es_prueba_carga INTEGER CHECK(es_prueba_carga IN (0, 1)) DEFAULT 0,
        carga_tipo_prueba TEXT,
        carga_hora_inicial TEXT,
        carga_hora_final TEXT,
        carga_peso_kg REAL,
        carga_realizado_por TEXT,
        carga_resultado TEXT,
        pegamento_lineal INTEGER CHECK(pegamento_lineal IN (0, 1)) DEFAULT 1,
        defecto_impresion INTEGER CHECK(defecto_impresion IN (0, 1)) DEFAULT 0,
        medida_ancho REAL,
        medida_largo REAL,
        medida_fuelle REAL,
        medidas_dentro_parametro INTEGER CHECK(medidas_dentro_parametro IN (0, 1)) DEFAULT 1,
        pegado_correcto_parche INTEGER CHECK(pegado_correcto_parche IN (0, 1, NULL)) DEFAULT 1,
        aplicacion_hot_melt_correcta INTEGER CHECK(aplicacion_hot_melt_correcta IN (0, 1, NULL)) DEFAULT 1,
        posicion_parche_correcta INTEGER CHECK(posicion_parche_correcta IN (0, 1, NULL)) DEFAULT 1,
        FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
      );
    `);

    // Migraciones en caso de base de datos existente
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN es_prueba_carga INTEGER CHECK(es_prueba_carga IN (0, 1)) DEFAULT 0`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_tipo_prueba TEXT`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_hora_inicial TEXT`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_hora_final TEXT`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_peso_kg REAL`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_realizado_por TEXT`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN carga_resultado TEXT`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN pegamento_lineal INTEGER CHECK(pegamento_lineal IN (0, 1)) DEFAULT 1`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN defecto_impresion INTEGER CHECK(defecto_impresion IN (0, 1)) DEFAULT 0`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN medida_ancho REAL`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN medida_largo REAL`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN medida_fuelle REAL`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN medidas_dentro_parametro INTEGER CHECK(medidas_dentro_parametro IN (0, 1)) DEFAULT 1`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN pegado_correcto_parche INTEGER CHECK(pegado_correcto_parche IN (0, 1, NULL)) DEFAULT 1`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN aplicacion_hot_melt_correcta INTEGER CHECK(aplicacion_hot_melt_correcta IN (0, 1, NULL)) DEFAULT 1`, () => {});
    db.run(`ALTER TABLE inspecciones_bolsas ADD COLUMN posicion_parche_correcta INTEGER CHECK(posicion_parche_correcta IN (0, 1, NULL)) DEFAULT 1`, () => {});

    // 5. Tabla de no conformidades (defectos y acciones correctivas)
    db.run(`
      CREATE TABLE IF NOT EXISTS no_conformidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspeccion_id INTEGER NOT NULL UNIQUE,
        descripcion_defecto TEXT NOT NULL,
        accion_correctiva TEXT NOT NULL,
        foto_url TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
      );
    `);

    // 6. Tabla de liberación de tarimas
    db.run(`
      CREATE TABLE IF NOT EXISTS liberacion_tarimas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_liberacion TEXT UNIQUE NOT NULL,
        maquina TEXT NOT NULL,
        numero_rollo TEXT NOT NULL,
        bobina_id INTEGER,
        tarima_correcta INTEGER NOT NULL CHECK (tarima_correcta IN (0, 1)),
        etiquetado_correcto INTEGER NOT NULL CHECK (etiquetado_correcto IN (0, 1)),
        bolsas_cumplen INTEGER NOT NULL CHECK (bolsas_cumplen IN (0, 1)),
        cinta_correcta INTEGER NOT NULL CHECK (cinta_correcta IN (0, 1)) DEFAULT 1,
        evidencia_acomodo_url TEXT,
        numero_tarima_dia INTEGER NOT NULL,
        operador TEXT NOT NULL,
        estado_liberacion TEXT NOT NULL DEFAULT 'Liberado',
        motivo TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bobina_id) REFERENCES bobinas(id)
      );
    `);

    // Migraciones para liberación de tarimas
    db.run(`ALTER TABLE liberacion_tarimas ADD COLUMN estado_liberacion TEXT NOT NULL DEFAULT 'Liberado'`, () => {});
    db.run(`ALTER TABLE liberacion_tarimas ADD COLUMN motivo TEXT`, () => {});
    db.run(`ALTER TABLE liberacion_tarimas ADD COLUMN cinta_correcta INTEGER CHECK (cinta_correcta IN (0, 1)) DEFAULT 1`, () => {});
    
    // Migraciones para registro de personal diario
    db.run(`ALTER TABLE registro_personal_diario ADD COLUMN meta INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE registro_personal_diario ADD COLUMN hora_actualizacion TEXT`, () => {});

    // 7. Tablas de Producción: Registro de Personal y Catálogo
    db.run(`
      CREATE TABLE IF NOT EXISTS registro_personal_diario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        turno TEXT NOT NULL,
        tipo_maquina TEXT NOT NULL,
        maquina TEXT NOT NULL,
        operador TEXT NOT NULL,
        auxiliar_1 TEXT,
        auxiliar_2 TEXT,
        auxiliar_3 TEXT,
        bolsas_producidas INTEGER DEFAULT 0,
        bolsas_tarima INTEGER DEFAULT 0,
        meta INTEGER DEFAULT 0,
        hora_actualizacion TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fecha, turno, tipo_maquina, maquina)
      );
    `);

    // Reiniciar los datos de la M1 por solicitud del usuario
    db.run("DELETE FROM registro_personal_diario WHERE maquina = 'M1';", () => {
      console.log('Datos de M1 reiniciados en base de datos SQLite.');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS catalogo_personal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        rol TEXT NOT NULL
      );
    `);

    // Insertar algunos nombres iniciales en el catálogo si está vacío
    db.get("SELECT COUNT(*) as count FROM catalogo_personal", [], (err, row) => {
      if (row && row.count === 0) {
        db.run(`INSERT INTO catalogo_personal (nombre, rol) VALUES 
          ('Carlos Gómez', 'Operador'),
          ('Juan Pérez', 'Operador'),
          ('Luis Torres', 'Operador'),
          ('Tomás Herrera', 'Operador'),
          ('David Ruiz', 'Auxiliar'),
          ('Eduardo Soto', 'Auxiliar'),
          ('Manuel Soto', 'Auxiliar'),
          ('Luis Díaz', 'Auxiliar')
        `);
      }
    });

    // Verificar si hay que insertar datos semilla
    db.get("SELECT COUNT(*) as count FROM bobinas", [], (err, row) => {
      if (row && row.count === 0) {
        insertSeeds();
      }
    });
  });
}

function insertSeeds() {
  console.log('Insertando datos semilla...');
  
  const hoy = new Date().toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const anteayer = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

  // Insertar Bobinas de prueba
  const bobinasData = [
    ['B-8090', 'Starbucks Kraft M', 80.0, 90, anteayer, 5.2],
    ['B-9012', 'McDonalds Delivery L', 90.0, 100, ayer, 4.8],
    ['B-7080', 'Zara Boutique S', 70.0, 80, hoy, 6.1]
  ];

  const stmtBobina = db.prepare(`
    INSERT INTO bobinas (numero_rollo, marca_especificaciones, ancho_bobina, gramaje, fecha_produccion_bobina, porcentaje_humedad) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  bobinasData.forEach((bobina, index) => {
    stmtBobina.run(bobina, function(err) {
      if (err) return console.error(err);
      const bobinaId = this.lastID;
      
      // Para cada bobina, creamos algunas inspecciones de prueba
      if (index === 0) {
        // Bobina de hace 2 días: Starbucks Kraft M
        // Inspección Flexo (Aprobada)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Flexo', 'Flexo 1', '08:30', 'Carlos Gómez', 1, 'Aprobado', 'Impresión limpia y alineada', '${anteayer} 08:30:00')`, function(err) {
          if (!err) {
            db.run(`INSERT INTO inspecciones_flexo (inspeccion_id, numero_tintas, impresion_correcta, registro_correcto, estado_fisico_rollo, ultimo_lavado_grabado)
                    VALUES (${this.lastID}, 3, 1, 1, 'Buenas condiciones', '2026-07-11')`);
          }
        });

        // Inspección Nanjang (Rechazada con defecto)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Nanjang', 'M3', '10:15', 'Ana Martínez', 1, 'Rechazado', 'Fallo en pegado del fondo en varias bolsas', '${anteayer} 10:15:00')`, function(err) {
          if (!err) {
            const inspId = this.lastID;
            db.run(`INSERT INTO inspecciones_bolsas (inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada)
                    VALUES (${inspId}, 1, 0, 1, 1, 1, 'Buenas condiciones', 220, 50)`);
            db.run(`INSERT INTO no_conformidades (inspeccion_id, descripcion_defecto, accion_correctiva, foto_url)
                    VALUES (${inspId}, 'Falta de pegamento en la solapa del fondo.', 'Ajuste de dosificador de pegamento y limpieza de boquilla.', '')`);
          }
        });

        // Inspección Nanjang (Aprobada posterior)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Nanjang', 'M3', '11:00', 'Ana Martínez', 1, 'Aprobado', 'Excelente tras ajuste de boquilla', '${anteayer} 11:00:00')`, function(err) {
          if (!err) {
            db.run(`INSERT INTO inspecciones_bolsas (inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada)
                    VALUES (${this.lastID}, 1, 1, 1, 1, 1, 'Buenas condiciones', 220, 100)`);
          }
        });
      } else if (index === 1) {
        // Bobina de ayer: McDonalds Delivery L
        // Inspección Flexo (Rechazada con defecto)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Flexo', 'Flexo 3', '14:20', 'Juan Pérez', 0, 'Rechazado', 'Falta de Print Card en máquina y corrimiento de registro de tinta roja', '${ayer} 14:20:00')`, function(err) {
          if (!err) {
            const inspId = this.lastID;
            db.run(`INSERT INTO inspecciones_flexo (inspeccion_id, numero_tintas, impresion_correcta, registro_correcto, estado_fisico_rollo, ultimo_lavado_grabado)
                    VALUES (${inspId}, 2, 1, 0, 'Buenas condiciones', '2026-07-12')`);
            db.run(`INSERT INTO no_conformidades (inspeccion_id, descripcion_defecto, accion_correctiva, foto_url)
                    VALUES (${inspId}, 'Registro desfasado por 2mm en el color secundario. Falta documento de Print Card.', 'Se detuvo máquina para alinear rodillos y se solicitó Print Card a oficina técnica.', '')`);
          }
        });

        // Inspección Con Asa (Aprobada)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Con Asa', 'M8', '16:00', 'Luis Torres', 1, 'Aprobado', 'Todo correcto. Temperatura de goma dentro de rango.', '${ayer} 16:00:00')`, function(err) {
          if (!err) {
            db.run(`INSERT INTO inspecciones_bolsas (inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada, pegamiento_suficiente_asa, pegamiento_suficiente_parche, posicion_asa_correcta, temperatura_pegamento)
                    VALUES (${this.lastID}, 1, 1, 1, 1, 1, 'Buenas condiciones', 150, 80, 1, 1, 1, 165.0)`);
          }
        });
      } else if (index === 2) {
        // Bobina de hoy: Zara Boutique S
        // Inspección Flexo (Aprobada)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Flexo', 'Flexo 2', '09:00', 'Carlos Gómez', 1, 'Aprobado', 'Impresión limpia', '${hoy} 09:00:00')`, function(err) {
          if (!err) {
            db.run(`INSERT INTO inspecciones_flexo (inspeccion_id, numero_tintas, impresion_correcta, registro_correcto, estado_fisico_rollo, ultimo_lavado_grabado)
                    VALUES (${this.lastID}, 1, 1, 1, 'Buenas condiciones', '2026-07-13')`);
          }
        });

        // Inspección Con Asa (Rechazada con defecto)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Con Asa', 'M11', '10:30', 'Sofía Ruiz', 1, 'Rechazado', 'Temperatura de pegamento baja y asas desalineadas.', '${hoy} 10:30:00')`, function(err) {
          if (!err) {
            const inspId = this.lastID;
            db.run(`INSERT INTO inspecciones_bolsas (inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada, pegamiento_suficiente_asa, pegamiento_suficiente_parche, posicion_asa_correcta, temperatura_pegamento)
                    VALUES (${inspId}, 1, 1, 1, 1, 1, 'Malas condiciones', 120, 40, 0, 0, 0, 130.0)`);
            db.run(`INSERT INTO no_conformidades (inspeccion_id, descripcion_defecto, accion_correctiva, foto_url)
                    VALUES (${inspId}, 'Pegamento a 130°C (mínimo es 155°C) provocando falla de adherencia y asas desplazadas.', 'Se aumentó la temperatura de la tina de goma y se re-calibró la fotocelda de colocación de asas.', '')`);
          }
        });

        // Inspección Con Asa (Aprobada)
        db.run(`INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
                VALUES (${bobinaId}, 'Con Asa', 'M11', '11:45', 'Sofía Ruiz', 1, 'Aprobado', 'Se normalizó la temperatura a 160°C y la colocación del asa.', '${hoy} 11:45:00')`, function(err) {
          if (!err) {
            db.run(`INSERT INTO inspecciones_bolsas (inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada, pegamiento_suficiente_asa, pegamiento_suficiente_parche, posicion_asa_correcta, temperatura_pegamento)
                    VALUES (${this.lastID}, 1, 1, 1, 1, 1, 'Buenas condiciones', 130, 60, 1, 1, 1, 160.0)`);
          }
        });
      }
    });
  });
  stmtBobina.finalize();
}

export default db;
