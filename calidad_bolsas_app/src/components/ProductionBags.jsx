import React, { useState, useEffect } from 'react';

export default function ProductionBags() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Dia'); // 'Dia' o 'Noche'
  const [tipoMaquina, setTipoMaquina] = useState('Armado'); // 'Flexo' o 'Armado'
  const [maquina, setMaquina] = useState('M1');
  const [bolsasProducidas, setBolsasProducidas] = useState('');
  const [bolsasTarima, setBolsasTarima] = useState('');
  const [meta, setMeta] = useState('');
  const [horaActualizacion, setHoraActualizacion] = useState('');
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchRegistros();
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

  // Buscar si ya existe una asignación para la máquina seleccionada
  const activeAssignment = registros.find(r => r.tipo_maquina === tipoMaquina && r.maquina === maquina);

  // Cargar meta, producción y hora de actualización del registro activo
  useEffect(() => {
    const now = new Date();
    const currentTimeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    if (activeAssignment) {
      setMeta(activeAssignment.meta || '');
      setBolsasProducidas(activeAssignment.bolsas_producidas || '');
      setBolsasTarima(activeAssignment.bolsas_tarima || '');
      setHoraActualizacion(activeAssignment.hora_actualizacion || currentTimeStr);
      setIsEditingMeta(!(activeAssignment.meta > 0)); // Si la meta ya está fijada (>0), bloquear
    } else {
      setMeta('');
      setBolsasProducidas('');
      setBolsasTarima('');
      setHoraActualizacion(currentTimeStr);
      setIsEditingMeta(true); // Permitir capturar meta libremente
    }
  }, [maquina, tipoMaquina, registros]);

  // Función para obtener horas transcurridas en el turno
  const getElapsedHours = (targetTurno, targetFecha, inputTime) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (targetFecha !== todayStr) {
      return 12; // Turno anterior completo
    }

    let decimalHour = 12;
    if (inputTime) {
      const [hh, mm] = inputTime.split(':').map(Number);
      decimalHour = hh + mm / 60;
    } else {
      const now = new Date();
      decimalHour = now.getHours() + now.getMinutes() / 60;
    }

    if (targetTurno === 'Dia') {
      // 7:00 AM - 7:00 PM
      if (decimalHour < 7) return 0;
      if (decimalHour >= 19) return 12;
      return decimalHour - 7;
    } else {
      // 7:00 PM - 7:00 AM (del día siguiente)
      if (decimalHour >= 19) {
        return decimalHour - 19;
      } else if (decimalHour < 7) {
        return decimalHour + 5; // 19:00 a 24:00 son 5 horas
      } else {
        return 12; // Fuera del horario de noche del día de hoy
      }
    }
  };

  const elapsedHours = getElapsedHours(turno, fecha, horaActualizacion);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bolsasProducidas || !bolsasTarima || !meta || !horaActualizacion) {
      showNotification('Introduce todos los campos requeridos.', 'danger');
      return;
    }

    setLoading(true);

    try {
      if (activeAssignment) {
        const res = await fetch(`/api/produccion/personal/${activeAssignment.id}/produccion`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bolsas_producidas: parseInt(bolsasProducidas, 10) || 0,
            bolsas_tarima: parseInt(bolsasTarima, 10) || 0,
            meta: parseInt(meta, 10) || 0,
            hora_actualizacion: horaActualizacion
          })
        });

        if (res.ok) {
          showNotification('Producción de bolsas guardada con éxito.', 'success');
          setBolsasProducidas('');
          setBolsasTarima('');
          setMeta('');
          fetchRegistros();
        } else {
          const errData = await res.json();
          showNotification(errData.error || 'Error al actualizar producción.', 'danger');
        }
      } else {
        const res = await fetch('/api/produccion/personal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha,
            turno,
            tipo_maquina: tipoMaquina,
            maquina,
            operador: 'Sin Asignar',
            auxiliar_1: '',
            auxiliar_2: '',
            auxiliar_3: '',
            bolsas_producidas: parseInt(bolsasProducidas, 10) || 0,
            bolsas_tarima: parseInt(bolsasTarima, 10) || 0,
            meta: parseInt(meta, 10) || 0,
            hora_actualizacion: horaActualizacion
          })
        });

        if (res.ok) {
          showNotification('Producción de bolsas guardada (sin personal asignado).', 'success');
          setBolsasProducidas('');
          setBolsasTarima('');
          setMeta('');
          fetchRegistros();
        } else {
          const errData = await res.json();
          showNotification(errData.error || 'Error al registrar producción.', 'danger');
        }
      }
    } catch (err) {
      showNotification(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

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
                ☀️ Día (7am - 7pm)
              </button>
              <button 
                type="button"
                className={`btn-secondary ${turno === 'Noche' ? 'active-tab' : ''}`}
                onClick={() => setTurno('Noche')}
                style={{ padding: '6px 16px', background: turno === 'Noche' ? 'var(--color-primary)' : '', color: turno === 'Noche' ? '#fff' : '' }}
              >
                🌙 Noche (7pm - 7am)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Formulario */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>Registro de Bolsas / Producción</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Captura el volumen producido por máquina</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
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

            <div style={{ background: '#f8f9fa', padding: '10px 15px', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Operador Asignado: </strong> 
                <span style={{ color: activeAssignment ? 'var(--color-primary)' : 'var(--text-muted)', marginLeft: '4px' }}>
                  {activeAssignment ? activeAssignment.operador : 'No asignado'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                ⏱️ {elapsedHours.toFixed(1)} hrs transcurridas
              </div>
            </div>

            <div className="form-group">
              <label>Hora de la Actualización</label>
              <input
                type="time"
                className="form-control"
                value={horaActualizacion}
                onChange={(e) => setHoraActualizacion(e.target.value)}
                required
                style={{ marginTop: '4px' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Meta de Producción (Bolsas)</label>
                {activeAssignment && activeAssignment.meta > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setIsEditingMeta(!isEditingMeta)} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {isEditingMeta ? '🔒 Bloquear Meta' : '✏️ Editar Meta'}
                  </button>
                )}
              </div>
              <input
                type="number"
                className="form-control"
                placeholder="Ej: 50000"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                required
                disabled={!isEditingMeta}
                style={{ marginTop: '4px', backgroundColor: !isEditingMeta ? '#f1f5f9' : '#fff' }}
              />
              {!isEditingMeta && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                  🔒 Meta fijada para el día. Se puede actualizar la producción abajo libremente.
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Bolsas Producidas en Máquina</label>
              <input
                type="number"
                className="form-control"
                placeholder="Ej: 48000"
                value={bolsasProducidas}
                onChange={(e) => setBolsasProducidas(e.target.value)}
                required
                style={{ marginTop: '4px' }}
              />
            </div>

            <div className="form-group">
              <label>Bolsas en Tarima</label>
              <input
                type="number"
                className="form-control"
                placeholder="Ej: 47500"
                value={bolsasTarima}
                onChange={(e) => setBolsasTarima(e.target.value)}
                required
                style={{ marginTop: '4px' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : '💾 Guardar Producción'}
            </button>
          </form>
        </div>

        {/* Tabla Rendimiento */}
        <div className="card" style={{ padding: '1.5rem', minHeight: '400px' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>Control de Rendimiento de Producción</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lista de máquinas activas y su porcentaje de aprobación</span>
          </div>

          {registros.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justify-content: 'center', height: '250px', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
              <span>📭 Ningún registro en este turno y fecha.</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Meta</th>
                    <th>Producidas</th>
                    <th>En Tarima</th>
                    <th>Meta por Hora</th>
                    <th>Estatus Avance</th>
                    <th>% Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(row => {
                    const prod = row.bolsas_producidas || 0;
                    const tarima = row.bolsas_tarima || 0;
                    const targetGoal = row.meta || 0;
                    
                    const rowElapsed = getElapsedHours(row.turno || turno, row.fecha || fecha, row.hora_actualizacion);
                    const expectedBags = Math.round((targetGoal / 12) * rowElapsed);
                    const diff = prod - expectedBags;
                    
                    const qualityPct = prod > 0 ? (tarima / prod) * 100 : 0;
                    
                    // Semáforo para Calidad
                    let qualityColor = 'var(--text-muted)';
                    let qualityBg = '#f1f5f9';
                    if (prod > 0) {
                      if (qualityPct >= 95) {
                        qualityColor = 'var(--color-success-dark)';
                        qualityBg = 'var(--color-success-bg)';
                      } else if (qualityPct >= 90) {
                        qualityColor = 'rgba(245, 158, 11, 1)';
                        qualityBg = 'rgba(245, 158, 11, 0.15)';
                      } else {
                        qualityColor = 'var(--color-danger-dark)';
                        qualityBg = 'var(--color-danger-bg)';
                      }
                    }

                    // Estatus de Avance
                    let advanceBadge = null;
                    if (targetGoal > 0) {
                      if (diff >= 0) {
                        advanceBadge = (
                          <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-dark)', fontWeight: '700' }}>
                            🟢 Bien (+{diff.toLocaleString()})
                          </span>
                        );
                      } else {
                        advanceBadge = (
                          <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)', fontWeight: '700' }}>
                            🔴 Retrasado ({diff.toLocaleString()})
                          </span>
                        );
                      }
                    } else {
                      advanceBadge = <span style={{ color: 'var(--text-muted)' }}>-</span>;
                    }

                    return (
                      <tr key={row.id}>
                        <td style={{ fontWeight: '700' }}>
                          <span className={`badge area-${row.tipo_maquina === 'Flexo' ? 'flexo' : 'nanjang'}`} style={{ marginRight: '6px' }}>
                            {row.tipo_maquina}
                          </span>
                          {row.maquina}
                          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                            {row.operador}
                          </div>
                        </td>
                        <td>{targetGoal > 0 ? targetGoal.toLocaleString() : '-'}</td>
                        <td>{prod.toLocaleString()}</td>
                        <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{tarima.toLocaleString()}</td>
                        <td>
                          {targetGoal > 0 ? (
                            <div>
                              <strong>{expectedBags.toLocaleString()}</strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                                ({rowElapsed.toFixed(1)} / 12 hrs)
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>{advanceBadge}</td>
                        <td>
                          {prod > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="badge" style={{ background: qualityBg, color: qualityColor, fontWeight: '700', width: 'fit-content' }}>
                                {qualityPct.toFixed(1)}%
                              </span>
                              <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(qualityPct, 100)}%`, height: '100%', background: qualityColor === 'var(--color-success-dark)' ? 'var(--color-success)' : qualityColor === 'var(--color-danger-dark)' ? 'var(--color-danger)' : 'orange' }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
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
