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

  // Creadenciales de acceso para la empresa
  const validUser = process.env.APP_USER || 'dipapel';
  const validPass = process.env.APP_PASS || 'calidad2024';
  
  const clienteUser = process.env.CLIENTE_USER || 'mcdonalds';
  const clientePass = process.env.CLIENTE_PASS || 'mcR3visi0n';

  let role = '';
  if (user === validUser && pass === validPass) {
    role = 'admin';
  } else if (user === clienteUser && pass === clientePass) {
    role = 'cliente';
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Privado Dipapel"');
    res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Credenciales incorrectas.');
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (role === 'cliente' && method !== 'GET' && method !== 'OPTIONS') {
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
  if (pathname === '/' || pathname === '/index.html' || pathname === '/app_portable.html' || pathname === '/cliente_mcdonalds.html') {
    const fileToServe = (role === 'cliente') 
       ? path.join(process.cwd(), 'cliente_mcdonalds.html') 
       : FILE_PATH;
    
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
      if (!list) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database timeout or failure' }));
        return;
      }
      
      let mapped = list.map(b => {
        const num = b.numero_rollo || b.numero_bobina || '';
        return {
          ...b,
          id: b.id,
          numero_rollo: num,
          numero_bobina: num,
          ancho_bobina: b.ancho_bobina || b.ancho || 80,
          marca_especificaciones: b.marca_especificaciones || b.proveedor || '',
          gramaje: b.gramaje || 90,
          porcentaje_humedad: b.porcentaje_humedad || 5.0,
          fecha_produccion_bobina: b.fecha_produccion_bobina || b.fecha || new Date().toISOString().split('T')[0]
        };
      });

      if (role === 'cliente') {
        // Para filtrar tarimas (que no tienen marca directamente), necesitamos cruzar con bobinas
        let bobinasList = await supabaseRequest('bobinas?select=*&order=id.desc&limit=1000');
        let bobinasMap = {};
        if (bobinasList) {
          bobinasList.forEach(item => {
             const bd = item.datos || {};
             const m = (bd.marca_especificaciones || bd.proveedor || '').toLowerCase();
             bobinasMap[bd.id || item.id] = m;
          });
        }
        
        mapped = mapped.filter(b => {
           // Si es una bolsa/producción normal que tiene marca
           let marca = (b.marca_especificaciones || b.proveedor || '').toLowerCase();
           
           // Si es una tarima, heredar la marca de su bobina vinculada
           if (!marca && b.codigo_liberacion && b.bobina_id) {
             marca = bobinasMap[b.bobina_id] || '';
           }
           
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        mapped = mapped.map(b => {
           delete b.operador;
           delete b.editado_por;
           delete b.usuario;
           return b;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newBobina) => {
        const num = (newBobina.numero_rollo || newBobina.numero_bobina || '').trim();
        const itemToSave = {
          id: String(newBobina.id || Date.now()),
          numero_bobina: num,
          proveedor: newBobina.marca_especificaciones || newBobina.proveedor || '',
          ancho: String(newBobina.ancho_bobina || newBobina.ancho || '80'),
          gramaje: String(newBobina.gramaje || '90'),
          metros: String(newBobina.metros || '1000'),
          area: newBobina.area || 'Flexo',
          fecha: newBobina.fecha_produccion_bobina || new Date().toISOString().split('T')[0],
          usuario: newBobina.usuario || 'Inspector'
        };

        await supabaseRequest('bobinas', 'POST', itemToSave);

        const responseItem = {
          ...newBobina,
          id: itemToSave.id,
          numero_rollo: num,
          numero_bobina: num
        };

        // Respaldo local
        const db = readDb();
        db.bobinas.unshift(responseItem);
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
      parseBody(req, async (parsedBody) => {
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
      const mapped = list.map(item => item.datos || item);
      if (role === 'cliente') {
        // Para filtrar tarimas (que no tienen marca directamente), necesitamos cruzar con bobinas
        let bobinasList = await supabaseRequest('bobinas?select=*&order=id.desc&limit=1000');
        let bobinasMap = {};
        if (bobinasList) {
          bobinasList.forEach(item => {
             const bd = item.datos || {};
             const m = (bd.marca_especificaciones || bd.proveedor || '').toLowerCase();
             bobinasMap[bd.id || item.id] = m;
          });
        }
        
        mapped = mapped.filter(b => {
           // Si es una bolsa/producción normal que tiene marca
           let marca = (b.marca_especificaciones || b.proveedor || '').toLowerCase();
           
           // Si es una tarima, heredar la marca de su bobina vinculada
           if (!marca && b.codigo_liberacion && b.bobina_id) {
             marca = bobinasMap[b.bobina_id] || '';
           }
           
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        mapped = mapped.map(b => {
           delete b.operador;
           delete b.editado_por;
           delete b.usuario;
           return b;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newItem) => {
        const id = String(newItem.id || Date.now());
        const itemToSave = { id, datos: newItem, fecha: new Date().toISOString() };
        await supabaseRequest('personal', 'POST', itemToSave);

        const db = readDb();
        db.produccion_personal.unshift(newItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newItem));
      });
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
      const mapped = list.map(item => item.datos || item);
      if (role === 'cliente') {
        // Para filtrar tarimas (que no tienen marca directamente), necesitamos cruzar con bobinas
        let bobinasList = await supabaseRequest('bobinas?select=*&order=id.desc&limit=1000');
        let bobinasMap = {};
        if (bobinasList) {
          bobinasList.forEach(item => {
             const bd = item.datos || {};
             const m = (bd.marca_especificaciones || bd.proveedor || '').toLowerCase();
             bobinasMap[bd.id || item.id] = m;
          });
        }
        
        mapped = mapped.filter(b => {
           // Si es una bolsa/producción normal que tiene marca
           let marca = (b.marca_especificaciones || b.proveedor || '').toLowerCase();
           
           // Si es una tarima, heredar la marca de su bobina vinculada
           if (!marca && b.codigo_liberacion && b.bobina_id) {
             marca = bobinasMap[b.bobina_id] || '';
           }
           
           return marca.includes('mcdonalds') || marca.includes('mc donalds');
        });
        mapped = mapped.map(b => {
           delete b.operador;
           delete b.editado_por;
           delete b.usuario;
           return b;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapped));
    } else if (method === 'POST') {
      getBody(req, async (newItem) => {
        const id = String(newItem.id || Date.now());
        const itemToSave = { id, datos: newItem, fecha: new Date().toISOString() };
        await supabaseRequest('bolsas', 'POST', itemToSave);

        const db = readDb();
        db.tarimas.unshift(newItem);
        writeDb(db);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newItem));
      });
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
