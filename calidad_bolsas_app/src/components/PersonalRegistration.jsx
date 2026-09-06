import React, { useState, useEffect } from 'react';

export default function PersonalRegistration() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Dia'); // 'Dia' o 'Noche'
  const [tipoMaquina, setTipoMaquina] = useState('Armado'); // 'Flexo' o 'Armado'
  const [maquina, setMaquina] = useState('M1');
  const [operador, setOperador] = useState('');
  const [auxiliar1, setAuxiliar1] = useState('');
  const [auxiliar2, setAuxiliar2] = useState('');
  const [auxiliar3, setAuxiliar3] = useState('');

  const [registros, setRegistros] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchRegistros();
    fetchCatalogo();
  }, [fecha, turno]);

  useEffect(() => {
    setMaquina('M1');
  }, [tipoMaquina]);

  const fetchRegistros = async () => {
    try {
      const res = await fetch(`/api/produccion/personal?fecha=${fecha}&turno=${turno}`);
      if (res.ok) {
        const data = await res.json();
        setRegistros(data);
      }
    } catch (err) {
      console.error('Error al cargar registros:', err);
    }
  };

  const fetchCatalogo = async () => {
    try {
      const res = await fetch('/api/produccion/personal/catalogo');
      if (res.ok) {
        const data = await res.json();
        setCatalogo(data);
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!operador.trim()) {
      showNotification('Introduce el nombre del operador.', 'danger');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/produccion/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          turno,
          tipo_maquina: tipoMaquina,
          maquina,
          operador: operador.trim(),
          auxiliar_1: tipoMaquina === 'Armado' ? auxiliar1.trim() : '',
          auxiliar_2: tipoMaquina === 'Armado' ? auxiliar2.trim() : '',
          auxiliar_3: tipoMaquina === 'Armado' ? auxiliar3.trim() : '',
          bolsas_producidas: 0,
          bolsas_tarima: 0
        })
      });

      if (res.ok) {
        showNotification('Personal registrado con éxito.', 'success');
        setOperador('');
        setAuxiliar1('');
        setAuxiliar2('');
        setAuxiliar3('');
        fetchRegistros();
        fetchCatalogo();
      } else {
        const errData = await res.json();
        showNotification(errData.error || 'Error al guardar el registro.', 'danger');
      }
    } catch (err) {
      showNotification(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta asignación?')) return;
    try {
      const res = await fetch(`/api/produccion/personal/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Registro de personal eliminado.', 'success');
        fetchRegistros();
      } else {
        showNotification('Error al eliminar registro.', 'danger');
      }
    } catch (err) {
      showNotification(err.message, 'danger');
    }
  };

  // Filtrar catálogo por roles
  const operadoresSurg = catalogo.filter(p => p.rol === 'Operador').map(p => p.nombre);
  const auxiliaresSurg = catalogo.filter(p => p.rol === 'Auxiliar').map(p => p.nombre);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Selector de periodo y turno en la parte superior */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '700', fontSize: '0.9rem' }}>Fecha:</label>
            <input 
              type="date" 
              className="form-control" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)} 
              style={{ width: '160px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '700', fontSize: '0.9rem' }}>Turno:</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                type="button"
                className={`btn-secondary ${turno === 'Dia' ? 'active-tab' : ''}`}
                onClick={() => setTurno('Dia')}
                style={{ padding: '6px 16px', background: turno === 'Dia' ? 'var(--color-primary)' : '', color: turno === 'Dia' ? '#fff' : '' }}
              >
                ☀️ Día
              </button>
              <button 
                type="button"
                className={`btn-secondary ${turno === 'Noche' ? 'active-tab' : ''}`}
                onClick={() => setTurno('Noche')}
                style={{ padding: '6px 16px', background: turno === 'Noche' ? 'var(--color-primary)' : '', color: turno === 'Noche' ? '#fff' : '' }}
              >
                🌙 Noche
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Formulario */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>Registro de Personal Diario</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asigna operadores y auxiliares a las máquinas</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo de Máquina</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${tipoMaquina === 'Flexo' ? 'active-tab' : ''}`}
                  onClick={() => setTipoMaquina('Flexo')}
                  style={{ flex: 1, padding: '8px', background: tipoMaquina === 'Flexo' ? 'var(--color-primary-light)' : '', color: tipoMaquina === 'Flexo' ? '#fff' : '' }}
                >
                  🖨️ Flexo
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${tipoMaquina === 'Armado' ? 'active-tab' : ''}`}
                  onClick={() => setTipoMaquina('Armado')}
                  style={{ flex: 1, padding: '8px', background: tipoMaquina === 'Armado' ? 'var(--color-primary-light)' : '', color: tipoMaquina === 'Armado' ? '#fff' : '' }}
                >
                  ⚙️ Armado
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Selecciona Máquina</label>
              <select 
                className="form-control" 
                value={maquina} 
                onChange={(e) => setMaquina(e.target.value)}
                style={{ marginTop: '4px' }}
              >
                {tipoMaquina === 'Flexo' ? (
                  ['M1', 'M2', 'M3', 'M4'].map(m => <option key={m} value={m}>{m}</option>)
                ) : (
                  ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'].map(m => <option key={m} value={m}>{m}</option>)
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Operador</label>
              <input
                type="text"
                className="form-control"
                placeholder="Escribe nombre de operador..."
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                list="operadores-list"
                required
                style={{ marginTop: '4px' }}
              />
              <datalist id="operadores-list">
                {operadoresSurg.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>

            {tipoMaquina === 'Armado' && (
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <legend style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 5px', color: 'var(--color-primary-light)' }}>Auxiliares (Opcionales)</legend>
                
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>Auxiliar 1</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe auxiliar 1..."
                    value={auxiliar1}
                    onChange={(e) => setAuxiliar1(e.target.value)}
                    list="auxiliares-list"
                    style={{ marginTop: '2px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>Auxiliar 2</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe auxiliar 2..."
                    value={auxiliar2}
                    onChange={(e) => setAuxiliar2(e.target.value)}
                    list="auxiliares-list"
                    style={{ marginTop: '2px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>Auxiliar 3</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe auxiliar 3..."
                    value={auxiliar3}
                    onChange={(e) => setAuxiliar3(e.target.value)}
                    list="auxiliares-list"
                    style={{ marginTop: '2px' }}
                  />
                </div>
              </fieldset>
            )}

            <datalist id="auxiliares-list">
              {auxiliaresSurg.map(n => <option key={n} value={n} />)}
            </datalist>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : '💾 Guardar Personal'}
            </button>
          </form>
        </div>

        {/* Tabla Historial */}
        <div className="card" style={{ padding: '1.5rem', minHeight: '400px' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>Personal Asignado en Turno</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lista de personal activo por máquina</span>
          </div>

          {registros.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
              <span>📭 Ningún personal registrado en este turno y fecha.</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Operador</th>
                    <th>Auxiliares</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(row => {
                    const auxs = [];
                    if (row.auxiliar_1) auxs.push(row.auxiliar_1);
                    if (row.auxiliar_2) auxs.push(row.auxiliar_2);
                    if (row.auxiliar_3) auxs.push(row.auxiliar_3);

                    return (
                      <tr key={row.id}>
                        <td style={{ fontWeight: '700' }}>
                          <span className={`badge area-${row.tipo_maquina === 'Flexo' ? 'flexo' : 'nanjang'}`} style={{ marginRight: '6px' }}>
                            {row.tipo_maquina}
                          </span>
                          {row.maquina}
                        </td>
                        <td style={{ fontWeight: '600' }}>{row.operador}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {auxs.length > 0 ? auxs.join(', ') : '-'}
                        </td>
                        <td>
                          <button 
                            type="button"
                            className="toggle-btn"
                            onClick={() => handleDelete(row.id)}
                            style={{ padding: '3px 8px', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
