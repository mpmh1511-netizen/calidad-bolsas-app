import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Garantizar que la carpeta uploads exista siempre
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir la carpeta uploads estáticamente
app.use('/uploads', express.static(uploadsDir));

// Configurar almacenamiento de fotos con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'defecto-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Máximo 25MB
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) {
      return cb(null, true);
    }
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    const filetypes = /jpeg|jpg|png|webp|heic|heif|gif/i;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(null, true); // Aceptar imágenes de dispositivos móviles o cámaras
  }
});

// --- ENDPOINTS API ---

// 1. Obtener todas las bobinas con detalles de Flexo
app.get('/api/bobinas', (req, res) => {
  const query = `
    SELECT b.*, 
           i.fecha_registro as flexo_fecha,
           i.maquina as flexo_maquina,
           i.operador as flexo_operador,
           f.numero_tintas as flexo_numero_tintas,
           f.impresion_correcta as flexo_impresion_correcta,
           f.registro_correcto as flexo_registro_correcto,
           f.estado_fisico_rollo as flexo_estado_fisico_rollo,
           f.ultimo_lavado_grabado as flexo_ultimo_lavado_grabado
    FROM bobinas b
    LEFT JOIN inspecciones i ON b.id = i.bobina_id AND i.area = 'Flexo'
    LEFT JOIN inspecciones_flexo f ON i.id = f.inspeccion_id
    ORDER BY b.fecha_registro DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 1.5 Actualizar el estado de una bobina
app.put('/api/bobinas/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado_bobina } = req.body;

  if (!estado_bobina) {
    return res.status(400).json({ error: 'El estado_bobina es requerido' });
  }

  const query = `
    UPDATE bobinas 
    SET estado_bobina = ? 
    WHERE id = ?
  `;

  db.run(query, [estado_bobina, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'No se encontró la bobina' });
    }
    res.json({ id: parseInt(id, 10), estado_bobina });
  });
});

// 2. Crear o actualizar una bobina (por defecto Sin Imprimir)
app.post('/api/bobinas', (req, res) => {
  const {
    numero_rollo,
    marca_especificaciones,
    ancho_bobina,
    gramaje,
    fecha_produccion_bobina,
    porcentaje_humedad,
    estado_bobina
  } = req.body;

  if (!numero_rollo || !marca_especificaciones || !ancho_bobina || !gramaje || !fecha_produccion_bobina || porcentaje_humedad === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para la bobina' });
  }

  const cleanNum = numero_rollo.trim();
  const statusToSave = estado_bobina || 'Sin Imprimir';

  // Buscar si ya existe una bobina con el mismo número de rollo
  db.get('SELECT id FROM bobinas WHERE LOWER(TRIM(numero_rollo)) = LOWER(TRIM(?))', [cleanNum], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      // Actualizar datos de la bobina existente
      const updateQuery = `
        UPDATE bobinas 
        SET marca_especificaciones = ?, ancho_bobina = ?, gramaje = ?, fecha_produccion_bobina = ?, porcentaje_humedad = ?, estado_bobina = ?
        WHERE id = ?
      `;
      db.run(updateQuery, [marca_especificaciones, ancho_bobina, gramaje, fecha_produccion_bobina, porcentaje_humedad, statusToSave, row.id], function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }
        res.json({
          id: row.id,
          numero_rollo: cleanNum,
          marca_especificaciones,
          ancho_bobina,
          gramaje,
          fecha_produccion_bobina,
          porcentaje_humedad,
          estado_bobina: statusToSave
        });
      });
    } else {
      // Insertar nueva bobina
      const insertQuery = `
        INSERT INTO bobinas (numero_rollo, marca_especificaciones, ancho_bobina, gramaje, fecha_produccion_bobina, porcentaje_humedad, estado_bobina)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(insertQuery, [cleanNum, marca_especificaciones, ancho_bobina, gramaje, fecha_produccion_bobina, porcentaje_humedad, statusToSave], function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }
        res.status(201).json({
          id: this.lastID,
          numero_rollo: cleanNum,
          marca_especificaciones,
          ancho_bobina,
          gramaje,
          fecha_produccion_bobina,
          porcentaje_humedad,
          estado_bobina: statusToSave
        });
      });
    }
  });
});

// 3. Obtener todas las inspecciones con detalles unidos
app.get('/api/inspecciones', (req, res) => {
  const query = `
    SELECT i.*, 
           b.numero_rollo, b.marca_especificaciones, b.ancho_bobina, b.gramaje, b.fecha_produccion_bobina, b.porcentaje_humedad,
           f.numero_tintas, f.impresion_correcta, f.registro_correcto, f.estado_fisico_rollo, f.ultimo_lavado_grabado,
           ib.pegado_disco, ib.pegado_fondo, ib.sin_rebabas_pegamento, ib.sin_ruptura_papel, ib.medidas_coinciden, ib.estado_gomas_fondo, ib.velocidad_trabajo, ib.cantidad_revisada, ib.pegamiento_suficiente_asa, ib.pegamiento_suficiente_parche, ib.posicion_asa_correcta, ib.temperatura_pegamento,
           ib.es_prueba_carga, ib.carga_peso_kg, ib.carga_tiempo_seg, ib.carga_resultado,
           ib.pegamento_lineal, ib.defecto_impresion, ib.medida_ancho, ib.medida_largo, ib.medida_fuelle, ib.medidas_dentro_parametro,
           ib.pegado_correcto_parche, ib.aplicacion_hot_melt_correcta, ib.posicion_parche_correcta,
           nc.descripcion_defecto, nc.accion_correctiva, nc.foto_url
    FROM inspecciones i
    JOIN bobinas b ON i.bobina_id = b.id
    LEFT JOIN inspecciones_flexo f ON i.id = f.inspeccion_id
    LEFT JOIN inspecciones_bolsas ib ON i.id = ib.inspeccion_id
    LEFT JOIN no_conformidades nc ON i.id = nc.inspeccion_id
    ORDER BY i.fecha_registro DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 4. Crear una nueva inspección (soporta carga de fotos)
app.post('/api/inspecciones', upload.single('foto'), (req, res) => {
  let data = {};
  try {
    data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : (req.body.data || req.body || {});
  } catch (errParse) {
    return res.status(400).json({ error: 'Formato de datos JSON inválido: ' + errParse.message });
  }

  const {
    bobina_id,
    area,
    maquina,
    hora_inspeccion,
    operador,
    tiene_print_card,
    resultado,
    observaciones,
    
    // Flexo
    numero_tintas,
    impresion_correcta,
    registro_correcto,
    estado_fisico_rollo,
    ultimo_lavado_grabado,

    // Nanjang y Con Asa
    pegado_disco,
    pegado_fondo,
    sin_rebabas_pegamento,
    sin_ruptura_papel,
    medidas_coinciden,
    estado_gomas_fondo,
    velocidad_trabajo,
    cantidad_revisada,

    // Con Asa
    pegamiento_suficiente_asa,
    pegamiento_suficiente_parche,
    posicion_asa_correcta,
    temperatura_pegamento,

    // Pruebas de Carga
    es_prueba_carga,
    carga_tipo_prueba,
    carga_hora_inicial,
    carga_hora_final,
    carga_peso_kg,
    carga_realizado_por,
    carga_resultado,

    // No Conformidades
    descripcion_defecto,
    accion_correctiva,
    fecha_registro
  } = data;

  if (!bobina_id || !area || !maquina || !hora_inspeccion || !operador || tiene_print_card === undefined || !resultado) {
    return res.status(400).json({ error: 'Faltan campos principales de inspección' });
  }

  // Iniciar una transacción manual en SQLite
  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    // Insertar en inspecciones
    const queryInspeccion = `
      INSERT INTO inspecciones (bobina_id, area, maquina, hora_inspeccion, operador, tiene_print_card, resultado, observaciones, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')))
    `;

    db.run(queryInspeccion, [
      bobina_id, 
      area, 
      maquina, 
      hora_inspeccion, 
      operador, 
      tiene_print_card ? 1 : 0, 
      resultado, 
      observaciones,
      fecha_registro || null
    ], function(err) {
      if (err) {
        db.run("ROLLBACK;");
        return res.status(500).json({ error: 'Error al crear la inspección: ' + err.message });
      }

      const inspeccionId = this.lastID;

      // Insertar según el área
      if (area === 'Flexo') {
        const queryFlexo = `
          INSERT INTO inspecciones_flexo (inspeccion_id, numero_tintas, impresion_correcta, registro_correcto, estado_fisico_rollo, ultimo_lavado_grabado)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(queryFlexo, [
          inspeccionId, 
          numero_tintas || 1, 
          impresion_correcta ? 1 : 0, 
          registro_correcto ? 1 : 0, 
          estado_fisico_rollo || 'Buenas condiciones', 
          ultimo_lavado_grabado || ''
        ], (err) => {
          if (err) {
            db.run("ROLLBACK;");
            return res.status(500).json({ error: 'Error al guardar detalles de Flexo: ' + err.message });
          }
          checkAndInsertNoConformidad(inspeccionId);
        });
      } else if (area === 'Nanjang' || area === 'Con Asa') {
        const queryBolsas = `
          INSERT INTO inspecciones_bolsas (
            inspeccion_id, pegado_disco, pegado_fondo, sin_rebabas_pegamento, sin_ruptura_papel, 
            medidas_coinciden, estado_gomas_fondo, velocidad_trabajo, cantidad_revisada,
            pegamiento_suficiente_asa, pegamiento_suficiente_parche, posicion_asa_correcta, temperatura_pegamento,
            es_prueba_carga, carga_tipo_prueba, carga_hora_inicial, carga_hora_final, carga_peso_kg, carga_realizado_por, carga_resultado,
            pegamento_lineal, defecto_impresion, medida_ancho, medida_largo, medida_fuelle, medidas_dentro_parametro,
            pegado_correcto_parche, aplicacion_hot_melt_correcta, posicion_parche_correcta
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const isConAsa = area === 'Con Asa';
        const isPruebaCarga = isConAsa && (es_prueba_carga ? 1 : 0);

        db.run(queryBolsas, [
          inspeccionId,
          pegado_disco !== undefined ? (pegado_disco ? 1 : 0) : 1,
          pegado_fondo !== undefined ? (pegado_fondo ? 1 : 0) : 1,
          sin_rebabas_pegamento !== undefined ? (sin_rebabas_pegamento ? 1 : 0) : 1,
          sin_ruptura_papel !== undefined ? (sin_ruptura_papel ? 1 : 0) : 1,
          medidas_coinciden !== undefined ? (medidas_coinciden ? 1 : 0) : 1,
          estado_gomas_fondo || 'Buenas condiciones',
          velocidad_trabajo || 0,
          cantidad_revisada || 0,
          isConAsa && !isPruebaCarga ? (pegamiento_suficiente_asa ? 1 : 0) : null,
          isConAsa && !isPruebaCarga ? (pegamiento_suficiente_parche ? 1 : 0) : null,
          isConAsa && !isPruebaCarga ? (posicion_asa_correcta ? 1 : 0) : null,
          isConAsa && !isPruebaCarga ? (temperatura_pegamento || 0) : null,
          isPruebaCarga ? 1 : 0,
          isPruebaCarga ? carga_tipo_prueba : null,
          isPruebaCarga ? carga_hora_inicial : null,
          isPruebaCarga ? carga_hora_final : null,
          isPruebaCarga ? parseFloat(carga_peso_kg) : null,
          isPruebaCarga ? carga_realizado_por : null,
          isPruebaCarga ? carga_resultado : null,
          pegamento_lineal !== undefined ? (pegamento_lineal ? 1 : 0) : 1,
          defecto_impresion !== undefined ? (defecto_impresion ? 1 : 0) : 0,
          medida_ancho !== undefined ? parseFloat(medida_ancho) : null,
          medida_largo !== undefined ? parseFloat(medida_largo) : null,
          medida_fuelle !== undefined ? parseFloat(medida_fuelle) : null,
          medidas_dentro_parametro !== undefined ? (medidas_dentro_parametro ? 1 : 0) : 1,
          isConAsa && !isPruebaCarga ? (pegado_correcto_parche !== undefined ? (pegado_correcto_parche ? 1 : 0) : 1) : null,
          isConAsa && !isPruebaCarga ? (aplicacion_hot_melt_correcta !== undefined ? (aplicacion_hot_melt_correcta ? 1 : 0) : 1) : null,
          isConAsa && !isPruebaCarga ? (posicion_parche_correcta !== undefined ? (posicion_parche_correcta ? 1 : 0) : 1) : null
        ], (err) => {
          if (err) {
            db.run("ROLLBACK;");
            return res.status(500).json({ error: 'Error al guardar detalles de Bolsas: ' + err.message });
          }
          checkAndInsertNoConformidad(inspeccionId);
        });
      } else {
        db.run("COMMIT;");
        res.status(201).json({ id: inspeccionId });
      }

      // Función para insertar no conformidad si aplica y actualizar estado de bobina
      function checkAndInsertNoConformidad(inspId) {
        // Actualizar automáticamente el estado de la bobina según el área de la inspección
        const nuevoEstado = area === 'Flexo' ? 'Impreso' : 'Utilizado';
        db.run("UPDATE bobinas SET estado_bobina = ? WHERE id = ?", [nuevoEstado, bobina_id]);

        if (resultado === 'Rechazado' && (descripcion_defecto || accion_correctiva || req.file)) {
          const fotoUrl = req.file ? `/uploads/${req.file.filename}` : '';
          const queryNC = `
            INSERT INTO no_conformidades (inspeccion_id, descripcion_defecto, accion_correctiva, foto_url)
            VALUES (?, ?, ?, ?)
          `;
          db.run(queryNC, [inspId, descripcion_defecto || '', accion_correctiva || '', fotoUrl], (err) => {
            if (err) {
              db.run("ROLLBACK;");
              return res.status(500).json({ error: 'Error al crear no conformidad: ' + err.message });
            }
            db.run("COMMIT;");
            res.status(201).json({ id: inspId, foto_url: fotoUrl });
          });
        } else {
          db.run("COMMIT;");
          res.status(201).json({ id: inspId });
        }
      }
    });
  });
});

// 5. Eliminar una inspección
app.delete('/api/inspecciones/:id', (req, res) => {
  const { id } = req.params;
  
  // Buscar primero si tiene foto para eliminarla del disco
  db.get('SELECT foto_url FROM no_conformidades WHERE inspeccion_id = ?', [id], (err, row) => {
    if (!err && row && row.foto_url) {
      const filePath = path.join(__dirname, row.foto_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Eliminar de inspecciones (las tablas hijas se borran en cascada)
    db.run('DELETE FROM inspecciones WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Inspección eliminada exitosamente' });
    });
  });
});

// --- ENDPOINTS LIBERACIÓN DE TARIMAS ---

// 6. Registrar una liberación de tarima
app.post('/api/tarimas', upload.single('foto'), (req, res) => {
  const {
    maquina,
    numero_rollo,
    bobina_id,
    tarima_correcta,
    etiquetado_correcto,
    bolsas_cumplen,
    cinta_correcta,
    operador,
    estado_liberacion,
    motivo
  } = req.body;

  if (!maquina || !numero_rollo || !operador) {
    return res.status(400).json({ error: 'Faltan campos requeridos (maquina, numero_rollo, operador)' });
  }

  // Obtener el número correlativo de la tarima para el día y máquina actual
  const countQuery = `
    SELECT COALESCE(MAX(numero_tarima_dia), 0) as lastNum 
    FROM liberacion_tarimas 
    WHERE maquina = ? AND date(fecha_registro) = date('now', 'localtime')
  `;

  db.get(countQuery, [maquina], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error al calcular el número de tarima: ' + err.message });
    }

    const num = (row ? row.lastNum : 0) + 1;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const codigo_liberacion = `${dd}_${mm}_${maquina}_${num}`;
    
    const fotoUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const insertQuery = `
      INSERT INTO liberacion_tarimas (
        codigo_liberacion, maquina, numero_rollo, bobina_id, 
        tarima_correcta, etiquetado_correcto, bolsas_cumplen, cinta_correcta,
        evidencia_acomodo_url, numero_tarima_dia, operador,
        estado_liberacion, motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      codigo_liberacion,
      maquina,
      numero_rollo,
      bobina_id ? parseInt(bobina_id, 10) : null,
      (tarima_correcta === 'true' || tarima_correcta === '1' || tarima_correcta === 1) ? 1 : 0,
      (etiquetado_correcto === 'true' || etiquetado_correcto === '1' || etiquetado_correcto === 1) ? 1 : 0,
      (bolsas_cumplen === 'true' || bolsas_cumplen === '1' || bolsas_cumplen === 1) ? 1 : 0,
      (cinta_correcta === 'true' || cinta_correcta === '1' || cinta_correcta === 1 || cinta_correcta === undefined) ? 1 : 0,
      fotoUrl,
      num,
      operador,
      estado_liberacion || 'Liberado',
      (estado_liberacion === 'Condicionado' || estado_liberacion === 'Rechazado') ? motivo : null
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al guardar la liberación de tarima: ' + err.message });
      }

      // Si la tarima está vinculada a una bobina, cambiar estado a 'Utilizado'
      if (bobina_id) {
        db.run("UPDATE bobinas SET estado_bobina = 'Utilizado' WHERE id = ?", [bobina_id]);
      }

      res.status(201).json({
        id: this.lastID,
        codigo_liberacion,
        numero_tarima_dia: num,
        evidencia_acomodo_url: fotoUrl
      });
    });
  });
});

// 7. Buscar tarima por código de liberación
app.get('/api/tarimas/buscar/:codigo', (req, res) => {
  const { codigo } = req.params;
  const query = `
    SELECT t.*, 
           b.marca_especificaciones, 
           b.ancho_bobina, 
           b.gramaje, 
           b.porcentaje_humedad,
           i.maquina as flexo_maquina,
           i.operador as flexo_operador,
           i.fecha_registro as flexo_fecha
    FROM liberacion_tarimas t
    LEFT JOIN bobinas b ON t.bobina_id = b.id
    LEFT JOIN inspecciones i ON b.id = i.bobina_id AND i.area = 'Flexo'
    WHERE t.codigo_liberacion = ?
  `;

  db.get(query, [codigo], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'No se encontró ninguna tarima liberada con ese código' });
    }
    res.json(row);
  });
});

// 8. Obtener listado de todas las tarimas liberadas
app.get('/api/tarimas', (req, res) => {
  const query = `
    SELECT t.*, b.marca_especificaciones
    FROM liberacion_tarimas t
    LEFT JOIN bobinas b ON t.bobina_id = b.id
    ORDER BY t.fecha_registro DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// --- ENDPOINTS REGISTRO DE PERSONAL Y PRODUCCIÓN ---

// 9. Obtener catálogo histórico de personal para autocompletado
app.get('/api/produccion/personal/catalogo', (req, res) => {
  const query = `SELECT nombre, rol FROM catalogo_personal ORDER BY nombre ASC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 10. Obtener asignaciones de personal del día
app.get('/api/produccion/personal', (req, res) => {
  const { fecha, turno } = req.query;
  let query = `SELECT * FROM registro_personal_diario`;
  let params = [];
  
  if (fecha || turno) {
    query += ` WHERE`;
    let conditions = [];
    if (fecha) {
      conditions.push(` fecha = ?`);
      params.push(fecha);
    }
    if (turno) {
      conditions.push(` turno = ?`);
      params.push(turno);
    }
    query += conditions.join(' AND');
  }
  query += ` ORDER BY tipo_maquina ASC, maquina ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 11. Guardar asignación de personal diaria y agregar nombres nuevos al catálogo
app.post('/api/produccion/personal', (req, res) => {
  const {
    fecha,
    turno,
    tipo_maquina,
    maquina,
    operador,
    auxiliar_1,
    auxiliar_2,
    auxiliar_3,
    bolsas_producidas,
    bolsas_tarima,
    meta,
    hora_actualizacion
  } = req.body;

  if (!fecha || !turno || !tipo_maquina || !maquina || !operador) {
    return res.status(400).json({ error: 'Faltan campos requeridos (fecha, turno, tipo_maquina, maquina, operador)' });
  }

  // Obtener hora local actual por defecto si no se pasa
  let actTime = hora_actualizacion;
  if (!actTime) {
    const now = new Date();
    actTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  const query = `
    INSERT INTO registro_personal_diario (
      fecha, turno, tipo_maquina, maquina, operador, auxiliar_1, auxiliar_2, auxiliar_3, bolsas_producidas, bolsas_tarima, meta, hora_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    fecha,
    turno,
    tipo_maquina,
    maquina,
    operador.trim(),
    auxiliar_1 ? auxiliar_1.trim() : null,
    auxiliar_2 ? auxiliar_2.trim() : null,
    auxiliar_3 ? auxiliar_3.trim() : null,
    parseInt(bolsas_producidas, 10) || 0,
    parseInt(bolsas_tarima, 10) || 0,
    parseInt(meta, 10) || 0,
    actTime
  ];

  db.run(query, values, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Ya existe un registro de personal asignado a esta máquina para este día y turno.' });
      }
      return res.status(500).json({ error: 'Error al registrar personal: ' + err.message });
    }

    const newId = this.lastID;

    // Transparente: Guardar nombres en el catálogo histórico de autocompletado
    const namesToRegister = [];
    if (operador) namesToRegister.push({ nombre: operador.trim(), rol: 'Operador' });
    if (auxiliar_1) namesToRegister.push({ nombre: auxiliar_1.trim(), rol: 'Auxiliar' });
    if (auxiliar_2) namesToRegister.push({ nombre: auxiliar_2.trim(), rol: 'Auxiliar' });
    if (auxiliar_3) namesToRegister.push({ nombre: auxiliar_3.trim(), rol: 'Auxiliar' });

    const insertCatStmt = db.prepare(`INSERT OR IGNORE INTO catalogo_personal (nombre, rol) VALUES (?, ?)`);
    namesToRegister.forEach(item => {
      insertCatStmt.run([item.nombre, item.rol]);
    });
    insertCatStmt.finalize();

    res.status(201).json({ id: newId, message: 'Registro de personal guardado con éxito.' });
  });
});

// 12. Actualizar producción y bolsas en tarima
app.put('/api/produccion/personal/:id/produccion', (req, res) => {
  const { id } = req.params;
  const { bolsas_producidas, bolsas_tarima, meta, hora_actualizacion } = req.body;

  if (bolsas_producidas === undefined || bolsas_tarima === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros de producción (bolsas_producidas y bolsas_tarima)' });
  }

  // Obtener hora local actual por defecto si no se pasa
  let actTime = hora_actualizacion;
  if (!actTime) {
    const now = new Date();
    actTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  const query = `
    UPDATE registro_personal_diario
    SET bolsas_producidas = ?, bolsas_tarima = ?, meta = ?, hora_actualizacion = ?
    WHERE id = ?
  `;

  db.run(query, [
    parseInt(bolsas_producidas, 10) || 0, 
    parseInt(bolsas_tarima, 10) || 0, 
    parseInt(meta, 10) || 0,
    actTime,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar producción: ' + err.message });
    }
    res.json({ message: 'Producción actualizada correctamente.' });
  });
});

// 13. Eliminar registro de personal
app.delete('/api/produccion/personal/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM registro_personal_diario WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar el registro: ' + err.message });
    }
    res.json({ message: 'Registro eliminado con éxito.' });
  });
});

// 14. Estadísticas de Producción resumidas por Día, Semana, Mes o Año
app.get('/api/produccion/estadisticas', (req, res) => {
  const { periodo, maquina, tipo_maquina } = req.query; // 'dia', 'semana', 'mes', 'ano'

  let selectPeriod = "fecha";
  let limit = '';
  if (periodo === 'semana') {
    selectPeriod = "strftime('%Y-%W', fecha)";
    limit = 'LIMIT 12'; // Últimas 12 semanas
  } else if (periodo === 'mes') {
    selectPeriod = "strftime('%Y-%m', fecha)";
    limit = 'LIMIT 12'; // Últimos 12 meses
  } else if (periodo === 'ano') {
    selectPeriod = "strftime('%Y', fecha)";
    limit = 'LIMIT 5'; // Últimos 5 años
  } else {
    // por defecto 'dia' -> agrupar por fecha y hora
    selectPeriod = "fecha || ' ' || COALESCE(hora_actualizacion, '07:00')";
    limit = 'LIMIT 30'; // Últimas 30 actualizaciones
  }

  // Cláusula WHERE para filtrar por máquina
  let whereClause = 'WHERE 1=1';
  const queryParams = [];
  if (maquina && tipo_maquina) {
    whereClause += ' AND maquina = ? AND tipo_maquina = ?';
    queryParams.push(maquina, tipo_maquina);
  }

  // 1. Resumen General
  const summaryQuery = `
    SELECT 
      SUM(bolsas_producidas) AS total_producido,
      SUM(bolsas_tarima) AS total_tarima,
      SUM(meta) AS total_meta
    FROM registro_personal_diario
    ${whereClause}
  `;

  // 2. Desglose por Máquina
  const machineQuery = `
    SELECT 
      maquina,
      tipo_maquina,
      SUM(bolsas_producidas) AS total_producido,
      SUM(bolsas_tarima) AS total_tarima,
      SUM(meta) AS total_meta
    FROM registro_personal_diario
    ${whereClause}
    GROUP BY tipo_maquina, maquina
    ORDER BY total_producido DESC
  `;

  // 3. Historial Cronológico
  const timelineQuery = `
    SELECT 
      ${selectPeriod} AS periodo,
      SUM(bolsas_producidas) AS total_producido,
      SUM(bolsas_tarima) AS total_tarima,
      SUM(meta) AS total_meta
    FROM registro_personal_diario
    ${whereClause}
    GROUP BY periodo
    ORDER BY periodo ASC
    ${limit}
  `;

  db.all(summaryQuery, queryParams, (errSummary, summaryRows) => {
    if (errSummary) {
      return res.status(500).json({ error: 'Error al obtener resumen de estadísticas: ' + errSummary.message });
    }

    db.all(machineQuery, queryParams, (errMachine, machineRows) => {
      if (errMachine) {
        return res.status(500).json({ error: 'Error al obtener desglose de máquinas: ' + errMachine.message });
      }

      db.all(timelineQuery, queryParams, (errTimeline, timelineRows) => {
        if (errTimeline) {
          return res.status(500).json({ error: 'Error al obtener línea de tiempo: ' + errTimeline.message });
        }

        res.json({
          resumen: summaryRows[0] || { total_producido: 0, total_tarima: 0, total_meta: 0 },
          desglose_maquinas: machineRows,
          linea_tiempo: timelineRows
        });
      });
    });
  });
});

// Middleware global para manejo de errores (captura fallos en Multer/Archivos y responde JSON)
app.use((err, req, res, next) => {
  console.error('Error no capturado en API:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Ocurrió un error en el servidor al procesar la solicitud'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor API corriendo en http://localhost:${PORT}`);
});
