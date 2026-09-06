import React, { useState, useEffect } from 'react';
import InspectionForm from './components/InspectionForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import BobinaForm from './components/BobinaForm.jsx';
import TarimaForm from './components/TarimaForm.jsx';
import RollosInventory from './components/RollosInventory.jsx';
import PersonalRegistration from './components/PersonalRegistration.jsx';
import ProductionBags from './components/ProductionBags.jsx';
import ProductionStats from './components/ProductionStats.jsx';


// --- CONFIGURACIÓN E INSTANT CLOUD FALLBACK SUPABASE ---
const SUPABASE_URL = 'https://mowuawcmedfcmbtmeodg.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_zdQ5JU1pm9c54u_IE7RsiA_SxvlZQnM';

const fetchFromSupabase = async (endpoint) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/${endpoint}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error directo Supabase:', e);
  }
  return null;
};

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState(localStorage.getItem('usuario_actual') || '');
  const [loginInput, setLoginInput] = useState('');
  const [section, setSection] = useState(null); // null, 'calidad', 'produccion'
  const [prodSubSection, setProdSubSection] = useState(null); // null, 'personal', 'bolsas'
  const [role, setRole] = useState(null); // null, 'inspector', 'estadisticas'
  const [selectedArea, setSelectedArea] = useState(null); // null, 'Flexo', 'Nanjang', 'Con Asa'
  const [bobinas, setBobinas] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [notification, setNotification] = useState(null);

  // Fallback para cargar el logo
  const logoFallback = (e) => {
    e.target.onerror = null;
    e.target.src = 'data:image/jpeg;base64,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';
  };

  // Cargar datos al montar y sincronizar cada 4 segundos
  useEffect(() => {
    if (usuarioActual) {
      fetchBobinas();
      fetchInspections();
      const interval = setInterval(() => {
        fetchBobinas();
        fetchInspections();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [usuarioActual]);

    const fetchBobinas = async () => {
    try {
      const res = await fetch('/api/bobinas');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBobinas(data);
          localStorage.setItem('cached_bobinas', JSON.stringify(data));
          return;
        }
      }
    } catch (_) {}

    // Fallback instantáneo directo a Supabase (por si el servidor de Render está durmiendo)
    const cloudData = await fetchFromSupabase('bobinas?select=*');
    if (Array.isArray(cloudData) && cloudData.length > 0) {
      const mapped = cloudData.map(b => {
        const num = b.numero_rollo || b.numero_bobina || '';
        return {
          ...b,
          id: b.id,
          numero_rollo: num,
          numero_bobina: num,
          ancho_bobina: b.ancho_bobina || b.ancho || 80,
          marca_especificaciones: b.marca_especificaciones || b.proveedor || ''
        };
      });
      setBobinas(mapped);
      localStorage.setItem('cached_bobinas', JSON.stringify(mapped));
      return;
    }

    const cached = localStorage.getItem('cached_bobinas');
    if (cached) {
      try { setBobinas(JSON.parse(cached)); } catch (_) {}
    }
  };

    const fetchInspections = async () => {
    try {
      const res = await fetch('/api/inspecciones');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setInspections(data);
          localStorage.setItem('cached_inspections', JSON.stringify(data));
          return;
        }
      }
    } catch (_) {}

    // Fallback instantáneo directo a Supabase
    const cloudData = await fetchFromSupabase('inspecciones?select=*');
    if (Array.isArray(cloudData) && cloudData.length > 0) {
      const mapped = cloudData.map(item => {
        const d = item.datos || {};
        return {
          ...d,
          id: item.id || d.id,
          bobina_id: d.bobina_id || item.bobina_id,
          area: item.area || d.area,
          maquina: item.maquina || d.maquina,
          operador: d.operador || item.usuario,
          resultado: d.resultado || item.tipo
        };
      });

      const uniqueList = [];
      const seenIds = new Set();
      for (const item of mapped) {
        if (item && item.id && !seenIds.has(String(item.id))) {
          seenIds.add(String(item.id));
          uniqueList.push(item);
        }
      }

      setInspections(uniqueList);
      localStorage.setItem('cached_inspections', JSON.stringify(uniqueList));
      return;
    }

    const cached = localStorage.getItem('cached_inspections');
    if (cached) {
      try { setInspections(JSON.parse(cached)); } catch (_) {}
    }
  };

  const handleDeleteInspection = async (id) => {
    try {
      const res = await fetch(`/api/inspecciones/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('Inspección eliminada correctamente.', 'success');
        fetchInspections();
      } else {
        showNotification('Error al eliminar la inspección.', 'danger');
      }
    } catch (err) {
      showNotification(err.message, 'danger');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginInput.trim()) {
      showNotification('Por favor, ingresa tu nombre.', 'danger');
      return;
    }
    const name = loginInput.trim();
    localStorage.setItem('usuario_actual', name);
    setUsuarioActual(name);
    showNotification(`Bienvenido, ${name}`, 'success');
  };

  // --- RENDER PANTALLA DE INICIAR SESIÓN ---
  if (!usuarioActual) {
    return (
      <div className="landing-container" style={{ justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <img 
          src="logo.png" 
          onError={logoFallback} 
          alt="Dipapel Logo" 
          className="landing-logo" 
          style={{ width: '130px', height: 'auto', marginBottom: '1.5rem' }}
        />
        <h1 className="landing-title" style={{ fontSize: '2.5rem' }}>Dipapel</h1>
        <h2 className="landing-subtitle" style={{ marginBottom: '2.5rem' }}>Planta Lechugueros &bull; Sistema de Gestión Industrial</h2>

        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--color-primary-dark)' }}>Iniciar Sesión</h3>
          
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: '700' }}>Nombre de la Persona en Turno</label>
              <input
                type="text"
                className="form-control"
                placeholder="Escribe tu nombre completo"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                required
                style={{ marginTop: '5px', padding: '10px' }}
              />
            </div>
            
            <button type="submit" className="btn-primary" style={{ padding: '12px', justifyContent: 'center', fontSize: '1rem', fontWeight: '700' }}>
              🚪 Entrar al Sistema
            </button>
          </form>
        </div>

        {notification && (
          <div className={`notification ${notification.type}`} style={{ display: 'flex' }}>
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER PANTALLA DE BIENVENIDA DE DOS PASOS ---
  if (!role && !prodSubSection) {
    // Si no ha seleccionado la sección principal
    if (!section) {
      return (
        <div className="landing-container">
          <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>👤 Sesión: {usuarioActual}</span>
            <button 
              className="btn-secondary" 
              onClick={() => { localStorage.removeItem('usuario_actual'); setUsuarioActual(''); }}
              style={{ padding: '6px 12px', borderColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
            >
              🚪 Salir
            </button>
          </div>
          <img 
            src="logo.png" 
            onError={logoFallback} 
            alt="Dipapel Logo" 
            className="landing-logo" 
          />
          <h1 className="landing-title">Dipapel</h1>
          <h2 className="landing-subtitle">Planta Lechugueros &bull; Sistema de Gestión Industrial</h2>
          
          <div style={{ width: '100%' }}>
            <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
              Selecciona el Módulo del Sistema
            </h3>
            <div className="role-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', maxWidth: '1100px', margin: '0 auto' }}>
              <div className="role-card" onClick={() => setSection('calidad')} style={{ padding: '2.2rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.2rem' }}>Calidad</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', textAlign: 'center' }}>Inspecciones, auditorías y liberación por área</p>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                  Ingresar
                </button>
              </div>

              <div className="role-card" onClick={() => setSection('produccion')} style={{ padding: '2.2rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.2rem' }}>Producción</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', textAlign: 'center' }}>Registro de personal, bolsas y tarimas</p>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                  Ingresar
                </button>
              </div>

              <div className="role-card" onClick={() => setSection('frias')} style={{ padding: '2.2rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.2rem' }}>Frías</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', textAlign: 'center' }}>Inspección de asas, pruebas de carga y liberación de tarimas (Banda 1 a 4)</p>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                  Ingresar
                </button>
              </div>

              <div className="role-card" onClick={() => { setSection('calidad'); setSelectedArea('Todas'); setRole('estadisticas'); }} style={{ padding: '2.2rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.2rem' }}>Estadísticas y Reportes</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', textAlign: 'center' }}>Filtro por máquina, inconformidades y exportación Excel/PDF</p>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                  Ingresar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Si seleccionó producción
    if (section === 'produccion') {
      return (
        <div className="landing-container">
          <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>👤 Sesión: {usuarioActual}</span>
            <button 
              className="btn-secondary" 
              onClick={() => { localStorage.removeItem('usuario_actual'); setUsuarioActual(''); }}
              style={{ padding: '6px 12px', borderColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
            >
              🚪 Salir
            </button>
          </div>
          <img 
            src="logo.png" 
            onError={logoFallback} 
            alt="Dipapel Logo" 
            className="landing-logo" 
          />
          <h1 className="landing-title">Dipapel</h1>
          <h2 className="landing-subtitle">Planta Lechugueros &bull; Sistema de Gestión Industrial</h2>
          
          <div style={{ width: '100%' }}>
            <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
              Módulo de Producción: Selecciona una Opción
            </h3>
            <div className="role-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', maxWidth: '900px', margin: '0 auto', gap: '1.5rem' }}>
              <div className="role-card" onClick={() => setProdSubSection('personal')} style={{ padding: '3rem 1.5rem' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Registro de Personal</h3>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                  Ingresar
                </button>
              </div>

              <div className="role-card" onClick={() => setProdSubSection('bolsas')} style={{ padding: '3rem 1.5rem' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Registro de Bolsas / Producción</h3>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', backgroundColor: 'var(--color-primary-light)' }}>
                  Ingresar
                </button>
              </div>

              <div className="role-card" onClick={() => setProdSubSection('estadisticas')} style={{ padding: '3rem 1.5rem' }}>
                <h3 className="role-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Estadísticas de Producción</h3>
                <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', backgroundColor: 'var(--color-success)' }}>
                  Ingresar
                </button>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setSection(null)} style={{ marginTop: '2.5rem', padding: '8px 16px', fontSize: '0.85rem' }}>
              ◀ Volver al menú principal
            </button>
          </div>
        </div>
      );
    }

    // Si seleccionó Frías y aún no tiene área o rol
    if (section === 'frias') {
      return (
        <div className="landing-container">
          <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>👤 Sesión: {usuarioActual}</span>
            <button 
              className="btn-secondary" 
              onClick={() => { localStorage.removeItem('usuario_actual'); setUsuarioActual(''); }}
              style={{ padding: '6px 12px', borderColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
            >
              🚪 Salir
            </button>
          </div>
          <img 
            src="logo.png" 
            onError={logoFallback} 
            alt="Dipapel Logo" 
            className="landing-logo" 
          />
          <h1 className="landing-title">Dipapel</h1>
          <h2 className="landing-subtitle">Planta Lechugueros &bull; Sección Frías</h2>
          
          <div style={{ width: '100%' }}>
            {!selectedArea ? (
              <div style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                  Paso 1: Selecciona la Banda de Frías
                </h3>
                <div className="role-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {['Banda 1', 'Banda 2', 'Banda 3', 'Banda 4'].map(banda => (
                    <div key={banda} className="role-card" onClick={() => setSelectedArea(banda)} style={{ padding: '2.5rem 1.5rem' }}>
                      <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>{banda}</h3>
                      <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Confección e inspección de bolsas frías</p>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary" onClick={() => setSection(null)} style={{ marginTop: '2.5rem', padding: '8px 16px', fontSize: '0.85rem' }}>
                  ◀ Volver al menú principal
                </button>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                  Paso 2: Selecciona la Opción para {selectedArea} (Frías)
                </h3>
                <div className="role-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  <div className="role-card" onClick={() => setRole('inspector')} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.2rem' }}>🔍 Inspección de Calidad</h3>
                    <p className="role-card-desc" style={{ textAlign: 'center', fontSize: '0.8rem' }}>Revisión de condiciones generales y parámetros de asas.</p>
                    <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                      Ingresar Inspección
                    </button>
                  </div>

                  <div className="role-card" onClick={() => setRole('pruebas_carga')} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.2rem',  }}>🏋️ Pruebas de Carga</h3>
                    <p className="role-card-desc" style={{ textAlign: 'center', fontSize: '0.8rem' }}>Resistencia estática / dinámica de asas por marca.</p>
                    <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                      Registrar Prueba
                    </button>
                  </div>

                  <div className="role-card" onClick={() => setRole('liberacion_tarimas')} style={{ padding: '2.5rem 1.5rem', borderTop: '4px solid #16a34a' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.2rem', color: '#16a34a' }}>📦 Liberación de Tarimas</h3>
                    <p className="role-card-desc" style={{ textAlign: 'center', fontSize: '0.8rem' }}>Control de tarimas FRÍAS con código distintivo.</p>
                    <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', backgroundColor: '#16a34a', borderColor: '#15803d' }}>
                      Liberar Tarima
                    </button>
                  </div>


                </div>
                <button className="btn-secondary" onClick={() => setSelectedArea(null)} style={{ marginTop: '2rem', padding: '8px 16px', fontSize: '0.85rem' }}>
                  ◀ Volver a seleccionar Banda
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Si seleccionó calidad y aún no tiene área o rol
    if (section === 'calidad') {
      return (
        <div className="landing-container">
          <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>👤 Sesión: {usuarioActual}</span>
            <button 
              className="btn-secondary" 
              onClick={() => { localStorage.removeItem('usuario_actual'); setUsuarioActual(''); }}
              style={{ padding: '6px 12px', borderColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
            >
              🚪 Salir
            </button>
          </div>
          <img 
            src="logo.png" 
            onError={logoFallback} 
            alt="Dipapel Logo" 
            className="landing-logo" 
          />
          <h1 className="landing-title">Dipapel</h1>
          <h2 className="landing-subtitle">Planta Lechugueros &bull; Sistema de Gestión Industrial</h2>
          
          <div style={{ width: '100%' }}>
            {!selectedArea ? (
              <div style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                  Paso 1: Selecciona el Área de Calidad
                </h3>
                <div className="role-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div className="role-card" onClick={() => setSelectedArea('Flexo')} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>Flexo</h3>
                    <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Área de Impresión y registro de bobinas</p>
                  </div>
                  
                  <div className="role-card" onClick={() => setSelectedArea('Nanjang')} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>Nanjang</h3>
                    <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Confección de bolsas sin asa</p>
                  </div>
                  
                  <div className="role-card" onClick={() => setSelectedArea('Con Asa')} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>Con Asa</h3>
                    <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Confección de bolsas con asa</p>
                  </div>

                  <div className="role-card" onClick={() => { setSelectedArea('Liberación de Tarimas'); setRole('liberacion_tarimas'); }} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>Liberación de Tarimas</h3>
                    <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Registrar y consultar liberación de tarimas</p>
                  </div>

                  <div className="role-card" onClick={() => { setSelectedArea('Inventario de Rollos'); setRole('inventario'); }} style={{ padding: '2.5rem 1.5rem' }}>
                    <h3 className="role-card-title" style={{ fontSize: '1.25rem' }}>Inventario de Rollos</h3>
                    <p className="role-card-desc" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Control de disponibilidad y búsqueda de rollos</p>
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => setSection(null)} style={{ marginTop: '2.5rem', padding: '8px 16px', fontSize: '0.85rem' }}>
                  ◀ Volver al menú principal
                </button>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                  Paso 2: Selecciona el Rol para el Área de {selectedArea}
                </h3>
                <div className="role-grid" style={{ gridTemplateColumns: selectedArea === 'Con Asa' ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr 1fr' }}>
                  <div className="role-card" onClick={() => setRole('inspector')} style={{ padding: '2.5rem 2rem' }}>
                    <h3 className="role-card-title">Inspector de Calidad</h3>
                    <p className="role-card-desc" style={{ textAlign: 'center' }}>Registrar controles de calidad visuales y de proceso.</p>
                    <button className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                      Ingresar Datos
                    </button>
                  </div>

                  {selectedArea === 'Con Asa' && (
                    <div className="role-card" onClick={() => setRole('pruebas_carga')} style={{ padding: '2.5rem 2rem' }}>
                      <h3 className="role-card-title">Pruebas de Carga</h3>
                      <p className="role-card-desc" style={{ textAlign: 'center' }}>Registrar resistencia física del asa estática / dinámica.</p>
                      <button className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', backgroundColor: 'var(--color-primary-light)' }}>
                        Registrar Prueba
                      </button>
                    </div>
                  )}
                  

                </div>
                <button className="btn-secondary" onClick={() => setSelectedArea(null)} style={{ marginTop: '2rem', padding: '8px 16px', fontSize: '0.85rem' }}>
                  ◀ Volver a seleccionar área
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // --- RENDER PANTALLA PRINCIPAL ---
  return (
    <div className="app-container">
      {/* Header Minimalista */}
      <header className="app-header">
        <div className="header-brand">
          <img 
            src="logo.png" 
            onError={logoFallback} 
            alt="Dipapel Logo" 
            className="header-logo" 
          />
          <div className="header-title-container">
            <h1 className="header-title">
              Dipapel
              <span className="header-badge" style={{
                background: section === 'produccion' ? 'rgba(79, 70, 229, 0.1)' : role === 'inspector' ? 'var(--color-success-bg)' : 'rgba(79, 70, 229, 0.05)',
                color: section === 'produccion' ? 'var(--color-primary)' : role === 'inspector' ? 'var(--color-success)' : '#4f46e5'
              }}>
                {section === 'produccion' ? (prodSubSection === 'personal' ? 'Producción - Registro de Personal' : prodSubSection === 'bolsas' ? 'Producción - Registro de Bolsas' : 'Producción - Estadísticas') : role === 'inspector' ? `Inspector - ${selectedArea}` : role === 'inventario' ? 'Inventario de Rollos' : `Estadísticas - ${selectedArea}`}
              </span>
            </h1>
            <span className="header-subtitle">
              {section === 'produccion' ? 'Planta Lechugueros • Control de Producción' : 'Planta Lechugueros • Control de Calidad'}
            </span>
          </div>
        </div>

        <div className="nav-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>👤 Sesión: {usuarioActual}</span>
          <button 
            className="btn-secondary" 
            onClick={() => {
              localStorage.removeItem('usuario_actual');
              setUsuarioActual('');
              setRole(null);
              setSelectedArea(null);
              setSection(null);
              setProdSubSection(null);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
          >
            🚪 Salir
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => {
              setRole(null);
              setSelectedArea(null);
              setSection(null);
              setProdSubSection(null);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ◀ Menú Principal
          </button>
        </div>
      </header>

      {/* Contenido Principal de las Vistas */}
      <main className="main-content">
        {section === 'produccion' ? (
          prodSubSection === 'personal' ? <PersonalRegistration usuarioActual={usuarioActual} /> : prodSubSection === 'bolsas' ? <ProductionBags usuarioActual={usuarioActual} /> : <ProductionStats usuarioActual={usuarioActual} />
        ) : (section === 'frias' && role === 'liberacion_tarimas') || role === 'liberacion_tarimas' ? (
          <TarimaForm 
            bobinas={bobinas} 
            onBobinasChanged={fetchBobinas}
            showNotification={showNotification}
            usuarioActual={usuarioActual}
            isFrias={section === 'frias'}
            bandaInicial={selectedArea}
          />
        ) : role === 'inventario' ? (
          <RollosInventory 
            bobinas={bobinas}
            onBobinasChanged={fetchBobinas}
            showNotification={showNotification}
            usuarioActual={usuarioActual}
          />
        ) : role === 'liberacion_tarimas' ? (
          <TarimaForm 
            bobinas={bobinas} 
            onBobinasChanged={fetchBobinas}
            showNotification={showNotification}
            usuarioActual={usuarioActual}
          />
        ) : (role === 'inspector' || role === 'pruebas_carga') ? (
          <InspectionForm 
            bobinas={bobinas} 
            inspections={inspections}
            initialArea={selectedArea}
            role={role}
            onInspectionSaved={() => {
              fetchInspections();
              fetchBobinas();
            }}
            showNotification={showNotification}
            usuarioActual={usuarioActual}
          />
        ) : (
          <Dashboard 
            inspections={inspections} 
            selectedArea={selectedArea}
            onDeleteInspection={handleDeleteInspection}
            usuarioActual={usuarioActual}
          />
        )}
      </main>

      {/* Notificaciones flotantes */}
      {notification && (
        <div className={`notification ${notification.type}`} style={{ display: 'flex' }}>
          <span>{notification.type === 'success' ? '✅' : '❌'}</span>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
