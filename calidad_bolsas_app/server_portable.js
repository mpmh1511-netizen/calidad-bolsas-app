import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const PORT = process.env.PORT || 8080;
const FILE_PATH = path.join(process.cwd(), 'app_portable.html');
const DB_PATH = path.join(process.cwd(), 'db.json');

// --- CONFIGURACIÓN SUPABASE EN LA NUBE ---
const SUPABASE_URL = 'https://mowuawcmedfcmbtmeodg.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_zdQ5JU1pm9c54u_IE7RsiA_SxvlZQnM';

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${SUPABASE_URL}/${endpoint}`, options);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error Supabase (${method} ${endpoint}):`, errText);
      return null;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error('Excepción Supabase:', e);
    return null;
  }
}

// Respaldo local si no hay red
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { bobinas: [], inspecciones: [], produccion_personal: [], tarimas: [] };
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { bobinas: [], inspecciones: [], produccion_personal: [], tarimas: [] };
  }
}

function writeDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {}
}

const server = http.createServer(async (req, res) => {
  // Configurar CORS y anti-caché
  const origin = req.headers.origin || 'https://calidad-bolsas-app.onrender.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- PROTECCIÓN POR CONTRASEÑA (BASIC AUTH) ---
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Privado Dipapel"');
    res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acceso Restringido. Se requiere contraseña.');
    return;
  }

  const auth = Buffer.from(authHeader.split(' ')[1] || '', 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  // Credenciales de acceso para la empresa y clientes
  const validUser = process.env.APP_USER || 'dipapel';
  const validPass = process.env.APP_PASS || 'calidad2024';
  
  const clienteUser = process.env.CLIENTE_USER || 'mcdonalds';
  const clientePass = process.env.CLIENTE_PASS || 'mcR3visi0n';

  const walmartUser = process.env.WALMART_USER || 'walmart';
  const walmartPass = process.env.WALMART_PASS || 'wmR3visi0n';

  let role = '';
  if (user === validUser && pass === validPass) {
    role = 'admin';
  } else if (user === clienteUser && pass === clientePass) {
    role = 'cliente';
  } else if (user === walmartUser && pass === walmartPass) {
    role = 'cliente_walmart';
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Privado Dipapel"');
    res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Credenciales incorrectas.');
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if ((role === 'cliente' || role === 'cliente_walmart') && method !== 'GET' && method !== 'OPTIONS') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Operación no permitida para clientes' }));
    return;
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- SERVIR FRONTEND ---
  if (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/app_portable.html' ||
    pathname === '/cliente_mcdonalds.html' ||
    pathname === '/cliente_walmart.html'
  ) {
    let fileToServe = FILE_PATH;
    if (role === 'cliente') {
      fileToServe = path.join(process.cwd(), 'cliente_mcdonalds.html');
    } else if (role === 'cliente_walmart') {
      fileToServe = path.join(process.cwd(), 'cliente_walmart.html');
    } else if (pathname === '/cliente_mcdonalds.html') {
      fileToServe = path.join(process.cwd(), 'cliente_mcdonalds.html');
    } else if (pathname === '/cliente_walmart.html') {
      fileToServe = path.join(process.cwd(), 'cliente_walmart.html');
    }
    
    fs.readFile(fileToServe, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error al leer el archivo portable: ' + err.message);
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate'
        });
        res.end(data);
      }
    });
    return;
  }

  // --- HELPER BODY RESILIENTE (JSON Y FORMDATA) ---
  const getBody = (req, callback) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        if (!body || !body.trim()) {
          await callback({});
          return;
        }
        let parsed = null;
        // Caso 1: FormData multipart con name="data"
        if (body.includes('name="data"')) {
          const match = body.match(/name="data"\r?\n\r?\n([\s\S]*?)\r?\n---/);
          if (match && match[1]) {
            parsed = JSON.parse(match[1].trim());
          }
        }
        // Caso 2: URL encoded data=...
        if (!parsed && body.startsWith('data=')) {
          const decoded = decodeURIComponent(body.substring(5));
          parsed = JSON.parse(decoded);
        }
        // Caso 3: Raw JSON
        if (!parsed) {
          parsed = JSON.parse(body);
        }
        await callback(parsed || {});
      } catch (e) {
        // Fallback regex para encontrar objeto JSON dentro del body
        const match = body.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            await callback(parsed);
            return;
          } catch (_) {}
        }
        console.error('Error procesando body:', e);
        await callback({});
      }
    });
  };

  // --- API BOBINAS ---
  if (pathname === '/api/bobinas') {
    if (method === 'GET') {
      let list = await supabaseRequest('bobinas?select=*&order=id.desc&limit=800');
      let inspList = await supabaseRequest('inspecciones?select=area,maquina,datos&order=id.desc&limit=800');
      if (!list) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database timeout or failure' }));
        return;
      }

      // Inferir estado por inspecciones para rollos existentes que aún tenían area="Flexo"
      const usedRollos = new Set();
      const printedRollos = new Set();
      if (Array.isArray(inspList)) {
        inspList.forEach(item => {
          const d = item.datos || {};
          const rNum = String(d.numero_rollo || '').trim().toLowerCase();
          const bId = String(d.bobina_id || '').trim();
          const area = item.area || d.area || '';
          if (area === 'Nanjang' || area === 'Con Asa') {
            if (rNum) usedRollos.add(rNum);
            if (bId) usedRollos.add('id:' + bId);
          } else if (area === 'Flexo') {
            if (rNum) printedRollos.add(rNum);
            if (bId) printedRollos.add('id:' + bId);
          }
        });
      }
      
      let mapped = list.map(b => {
        const num = b.numero_rollo || b.numero_bobina || '';
        const numLow = String(num).trim().toLowerCase();
        const idKey = 'id:' + String(b.id).trim();
        
        // Recuperar datos extra si se guardaron en el campo metros (formato "1000|humedad|estado")
        let humedad = b.porcentaje_humedad;
        let estadoGuardado = b.estado_bobina;
        if (b.area === 'Sin Imprimir' || b.area === 'Impreso' || b.area === 'Utilizado') {
          estadoGuardado = b.area;
        }
        if (typeof b.metros === 'string' && b.metros.includes('|')) {
          const parts = b.metros.split('|');
          if (parts[1] !== undefined && parts[1] !== '') humedad = parseFloat(parts[1]);
          if (parts[2]) estadoGuardado = parts[2];
        }

        // Si no tiene un estado explícito guardado o se quedó en 'Flexo', inferir de las inspecciones
        if (!estadoGuardado) {
          if (usedRollos.has(numLow) || usedRollos.has(idKey)) {
            estadoGuardado = 'Utilizado';
          } else if (printedRollos.has(numLow) || printedRollos.has(idKey)) {
            estadoGuardado = 'Impreso';
          } else {
            estadoGuardado = 'Sin Imprimir';
          }
        } else if (estadoGuardado !== 'Utilizado' && (usedRollos.has(numLow) || usedRollos.has(idKey))) {
          // Si ya fue usado en Nanjang o Con Asa, debe aparecer como Utilizado
          estadoGuardado = 'Utilizado';
        }

        return {
          ...b,
          id: b.id,
          numero_rollo: num,
          numero_bobina: num,
          ancho_bobina: b.ancho_bobina || b.ancho || 80,
          marca_especificaciones: b.marca_especificaciones || b.proveedor || '',
          gramaje: b.gramaje || 90,
          porcentaje_humedad: (humedad !== undefined && humedad !== null && !isNaN(humedad)) ? humedad : 5.0,
          fecha_produccion_bobina: b.fecha_produccion_bobina || b.fecha || new Date().toISOString().split('T')[0],
          estado_bobina: estadoGuardado
        };
      });

      if (role === 'cliente') {
        mapped = mapped.filter(b => {
           let marca = (b.marca_especificaciones || b.proveedor || b.marca || '').toLowerCase();
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        mapped = mapped.map(b => {
           delete b.operador;
           delete b.editado_por;
           delete b.usuario;
           return b;
        });
      } else if (role === 'cliente_walmart') {
        // Walmart no tiene acceso a nada de inventario de rollos
        mapped = [];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newBobina) => {
        const num = (newBobina.numero_rollo || newBobina.numero_bobina || '').trim();
        const idStr = String(newBobina.id || Date.now());
        const estado = newBobina.estado_bobina || 'Sin Imprimir';
        const hum = (newBobina.porcentaje_humedad !== undefined && newBobina.porcentaje_humedad !== null) ? newBobina.porcentaje_humedad : '';
        
        const itemToSave = {
          id: idStr,
          numero_bobina: num,
          proveedor: newBobina.marca_especificaciones || newBobina.proveedor || '',
          ancho: String(newBobina.ancho_bobina || newBobina.ancho || '80'),
          gramaje: String(newBobina.gramaje || '90'),
          metros: `1000|${hum}|${estado}`,
          area: estado,
          fecha: newBobina.fecha_produccion_bobina || new Date().toISOString().split('T')[0],
          usuario: newBobina.usuario || 'Inspector'
        };

        // Intentar actualizar si ya existe ese id o numero_bobina, o insertar si es nuevo
        const existing = await supabaseRequest(`bobinas?select=id&or=(id.eq.${encodeURIComponent(idStr)},numero_bobina.eq.${encodeURIComponent(num)})&limit=1`);
        if (existing && existing.length > 0) {
          const targetId = existing[0].id;
          delete itemToSave.id;
          await supabaseRequest(`bobinas?id=eq.${encodeURIComponent(targetId)}`, 'PATCH', itemToSave);
          itemToSave.id = targetId;
        } else {
          await supabaseRequest('bobinas', 'POST', itemToSave);
        }

        const responseItem = {
          ...newBobina,
          id: itemToSave.id,
          numero_rollo: num,
          numero_bobina: num,
          estado_bobina: estado
        };

        // Respaldo local
        const db = readDb();
        const idx = db.bobinas.findIndex(x => String(x.id) === String(responseItem.id) || String(x.numero_rollo).toLowerCase() === num.toLowerCase());
        if (idx >= 0) db.bobinas[idx] = responseItem;
        else db.bobinas.unshift(responseItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseItem));
      });
    }
    return;
  }

  // --- API INSPECCIONES ---
  if (pathname === '/api/inspecciones') {
    if (method === 'GET') {
      let list = await supabaseRequest('inspecciones?select=*&order=id.desc&limit=800');
      if (!list) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database timeout or failure' }));
        return;
      }
      
      const mapped = list.map(item => {
        const d = item.datos || {};
        return {
          ...d,
          id: item.id || d.id,
          bobina_id: d.bobina_id || item.bobina_id,
          area: item.area || d.area,
          maquina: item.maquina || d.maquina,
          operador: d.operador || item.usuario,
          resultado: d.resultado || item.tipo,
          observaciones: d.observaciones || ''
        };
      });

      // Deduplicar por id
      const uniqueList = [];
      const seenIds = new Set();
      for (const item of mapped) {
        if (item && item.id && !seenIds.has(String(item.id))) {
          seenIds.add(String(item.id));
          uniqueList.push(item);
        }
      }

      let clientList = uniqueList;
      if (role === 'cliente') {
        clientList = clientList.filter(i => {
           const marca = (i.marca_especificaciones || i.marca_cliente || i.marca || '').toLowerCase();
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        clientList = clientList.map(i => {
           delete i.operador;
           delete i.editado_por;
           delete i.usuario;
           delete i.carga_realizado_por;
           delete i.realizado_por;
           return i;
        });
      } else if (role === 'cliente_walmart') {
        let bobinasList = await supabaseRequest('bobinas?select=*&order=id.desc&limit=1000');
        let bobinasMap = {};
        if (bobinasList) {
          bobinasList.forEach(item => {
             const bd = item.datos || item || {};
             const m = (bd.marca_especificaciones || bd.proveedor || '').toLowerCase();
             bobinasMap[bd.id || item.id] = m;
             const rNum = (bd.numero_rollo || bd.numero_bobina || '').toLowerCase();
             if (rNum) bobinasMap['rollo:' + rNum] = m;
          });
        }
        clientList = clientList.filter(i => {
           let marca = (i.marca_especificaciones || i.marca_cliente || i.marca || '').toLowerCase();
           if (!marca) {
             if (i.bobina_id && bobinasMap[i.bobina_id]) marca = bobinasMap[i.bobina_id];
             else if (i.numero_rollo && bobinasMap['rollo:' + String(i.numero_rollo).toLowerCase()]) marca = bobinasMap['rollo:' + String(i.numero_rollo).toLowerCase()];
             else if (i.numero_bobina && bobinasMap['rollo:' + String(i.numero_bobina).toLowerCase()]) marca = bobinasMap['rollo:' + String(i.numero_bobina).toLowerCase()];
           }
           return marca.includes('walmart') || marca.includes('wal-mart');
        });
        clientList = clientList.map(i => {
           delete i.operador;
           delete i.editado_por;
           delete i.usuario;
           delete i.carga_realizado_por;
           delete i.realizado_por;
           delete i.maquina;
           delete i.banda;
           return i;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(clientList));
    } else if (method === 'POST') {
      getBody(req, async (parsedBody) => {
        let payload = parsedBody;
        if (parsedBody && parsedBody.data) {
          payload = typeof parsedBody.data === 'string' ? JSON.parse(parsedBody.data) : parsedBody.data;
        }

        const id = String(payload.id || Date.now());
        const itemToSave = {
          id,
          area: payload.area || 'Flexo',
          maquina: payload.maquina || 'M-1',
          tipo: payload.resultado || 'Aprobado',
          datos: payload,
          fecha: new Date().toISOString(),
          usuario: payload.operador || 'Inspector'
        };

        await supabaseRequest('inspecciones', 'POST', itemToSave);

        const responseItem = { ...payload, id };

        const db = readDb();
        db.inspecciones.unshift(responseItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseItem));
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const id = parsedUrl.searchParams.get('id');
      getBody(req, async (parsedBody) => {
        if (!id) {
          res.writeHead(400); res.end(JSON.stringify({ error: 'Falta ID' }));
          return;
        }
        let payload = parsedBody;
        if (parsedBody && parsedBody.data) {
          payload = typeof parsedBody.data === 'string' ? JSON.parse(parsedBody.data) : parsedBody.data;
        }
        const itemToSave = {
          area: payload.area || 'Flexo',
          maquina: payload.maquina || 'M-1',
          tipo: payload.resultado || 'Aprobado',
          datos: payload,
          fecha: payload.fecha_registro || new Date().toISOString(),
          usuario: payload.operador || 'Inspector'
        };
        await supabaseRequest(`inspecciones?id=eq.${id}`, 'PATCH', itemToSave);
        
        const db = readDb();
        const idx = db.inspecciones.findIndex(i => String(i.id) === String(id));
        if (idx >= 0) {
          db.inspecciones[idx] = { ...payload, id };
          writeDb(db);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    } else if (method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        await supabaseRequest(`inspecciones?id=eq.${id}`, 'DELETE');
        const db = readDb();
        db.inspecciones = db.inspecciones.filter(ins => String(ins.id) !== String(id));
        writeDb(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Falta ID' }));
      }
    }
    return;
  }

  // --- API PERSONAL ---
  if (pathname === '/api/produccion/personal') {
    if (method === 'GET') {
      let list = await supabaseRequest('personal?select=*&order=id.desc&limit=800');
      if (!list) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database timeout or failure' }));
        return;
      }
      let mapped = list.map(item => {
        if (item.datos) return item.datos;
        if (item.puesto && typeof item.puesto === 'string' && item.puesto.startsWith('{')) {
          try { return JSON.parse(item.puesto); } catch (_) {}
        }
        return item;
      });
      if (role === 'cliente' || role === 'cliente_walmart') {
        mapped = [];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newItem) => {
        const id = String(newItem.id || Date.now());
        // La tabla 'personal' en Supabase tiene columnas: id, nombre, puesto, turno, fecha
        const itemToSave = {
          id,
          nombre: newItem.operador || newItem.nombre || '',
          puesto: JSON.stringify(newItem),
          turno: newItem.turno || 'Dia',
          fecha: newItem.fecha || new Date().toISOString().split('T')[0]
        };
        const existing = await supabaseRequest(`personal?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
        if (existing && existing.length > 0) {
          const patchData = { ...itemToSave };
          delete patchData.id;
          await supabaseRequest(`personal?id=eq.${encodeURIComponent(id)}`, 'PATCH', patchData);
        } else {
          await supabaseRequest('personal', 'POST', itemToSave);
        }

        const db = readDb();
        db.produccion_personal.unshift(newItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newItem));
      });
    } else if (method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        await supabaseRequest(`personal?id=eq.${encodeURIComponent(id)}`, 'DELETE');
        const db = readDb();
        db.produccion_personal = db.produccion_personal.filter(p => String(p.id) !== String(id));
        writeDb(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Falta ID' }));
      }
    }
    return;
  }

  // --- API BOLSAS / TARIMAS ---
  if (pathname === '/api/tarimas' || pathname === '/api/produccion/bolsas') {
    if (method === 'GET') {
      let list = await supabaseRequest('bolsas?select=*&order=id.desc&limit=800');
      if (!list) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database timeout or failure' }));
        return;
      }
      let mapped = list.map(item => {
        if (item.datos) return item.datos;
        if (item.tipo_bolsa && typeof item.tipo_bolsa === 'string' && item.tipo_bolsa.startsWith('{')) {
          try { return JSON.parse(item.tipo_bolsa); } catch (_) {}
        }
        return item;
      });
      if (role === 'cliente' || role === 'cliente_walmart') {
        // Para filtrar tarimas (que no tienen marca directamente), cruzamos con bobinas e inspecciones
        let bobinasList = await supabaseRequest('bobinas?select=*&order=id.desc&limit=1000');
        let inspList = await supabaseRequest('inspecciones?select=datos&order=id.desc&limit=1000');
        let bobinasMap = {};
        if (bobinasList) {
          bobinasList.forEach(item => {
             const bd = item.datos || item || {};
             const m = (bd.marca_especificaciones || bd.proveedor || bd.marca || '').toLowerCase();
             if (m) {
               bobinasMap[bd.id || item.id] = m;
               const rNum = String(bd.numero_rollo || bd.numero_bobina || '').trim().toLowerCase();
               if (rNum) bobinasMap['rollo:' + rNum] = m;
             }
          });
        }
        if (Array.isArray(inspList)) {
          inspList.forEach(item => {
            const d = item.datos || {};
            const m = String(d.marca_especificaciones || d.marca_cliente || d.marca || '').trim().toLowerCase();
            const rNum = String(d.numero_rollo || '').trim().toLowerCase();
            if (m && rNum && !bobinasMap['rollo:' + rNum]) {
              bobinasMap['rollo:' + rNum] = m;
            }
          });
        }
        
        mapped = mapped.filter(b => {
           if (!b || (!b.codigo_liberacion && !b.codigo_tarima && !b.bolsas_producidas)) return false;
           // Si es una bolsa/producción normal o tarima que ya tiene marca
           let marca = String(b.marca || b.marca_especificaciones || b.marca_cliente || b.proveedor || '').toLowerCase();
           
           // Si es una tarima sin marca directa, heredar la marca de su bobina o inspección vinculada
           if (!marca && (b.codigo_liberacion || b.codigo_tarima)) {
             const r1 = String(b.numero_rollo || '').trim().toLowerCase();
             const r2 = String(b.bobina || '').trim().toLowerCase();
             if (b.bobina_id && bobinasMap[b.bobina_id]) {
               marca = bobinasMap[b.bobina_id];
             } else if (r1 && bobinasMap['rollo:' + r1]) {
               marca = bobinasMap['rollo:' + r1];
             } else if (r2 && bobinasMap['rollo:' + r2]) {
               marca = bobinasMap['rollo:' + r2];
             }
           }
           
           if (role === 'cliente_walmart') {
             return marca.includes('walmart') || marca.includes('wal-mart');
           }
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        mapped = mapped.map(b => {
           const copy = { ...b };
           delete copy.operador;
           delete copy.editado_por;
           delete copy.usuario;
           delete copy.carga_realizado_por;
           delete copy.realizado_por;
           if (role === 'cliente_walmart') {
             delete copy.maquina;
             delete copy.banda;
           }
           return copy;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newItem) => {
        const id = String(newItem.id || Date.now());
        // La tabla 'bolsas' en Supabase tiene columnas: id, maquina, tipo_bolsa, cantidad, operador, fecha
        const itemToSave = {
          id,
          maquina: newItem.maquina || newItem.banda || '',
          tipo_bolsa: JSON.stringify(newItem),
          cantidad: String(newItem.numero_tarima_dia || newItem.bolsas_producidas || 1),
          operador: newItem.operador || '',
          fecha: newItem.fecha_registro || new Date().toISOString()
        };
        const existing = await supabaseRequest(`bolsas?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
        if (existing && existing.length > 0) {
          const patchData = { ...itemToSave };
          delete patchData.id;
          await supabaseRequest(`bolsas?id=eq.${encodeURIComponent(id)}`, 'PATCH', patchData);
        } else {
          await supabaseRequest('bolsas', 'POST', itemToSave);
        }

        const db = readDb();
        db.tarimas.unshift(newItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newItem));
      });
    } else if (method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        await supabaseRequest(`bolsas?id=eq.${encodeURIComponent(id)}`, 'DELETE');
        const db = readDb();
        db.tarimas = db.tarimas.filter(t => String(t.id) !== String(id));
        writeDb(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Falta ID' }));
      }
    }
    return;
  }

  // 404 por defecto
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log(`Servidor Dipapel con Supabase corriendo en el puerto ${PORT}`);
});
