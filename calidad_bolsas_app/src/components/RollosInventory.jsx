import React, { useState } from 'react';

export default function RollosInventory({ bobinas, onBobinasChanged, showNotification }) {
  const [activeTab, setActiveTab] = useState('Sin Imprimir'); // 'Sin Imprimir' | 'Impreso' | 'Utilizado' | 'Cuarentena' | 'Todos'
  const [searchRollo, setSearchRollo] = useState('');
  const [searchImpresor, setSearchImpresor] = useState('');
  const [searchFecha, setSearchFecha] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Estado para el formulario de nuevo rollo sin imprimir
  const [newRollo, setNewRollo] = useState({
    numero_rollo: '',
    marca_especificaciones: '',
    ancho_bobina: '',
    gramaje: '',
    fecha_produccion_bobina: new Date().toISOString().split('T')[0],
    porcentaje_humedad: '5.0'
  });
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Cambiar el estado de la bobina manualmente
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/bobinas/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_bobina: newStatus })
      });

      if (res.ok) {
        showNotification(`Estado del rollo actualizado a "${newStatus}".`, 'success');
        if (onBobinasChanged) onBobinasChanged();
      } else {
        const errData = await res.json();
        showNotification(errData.error || 'Error al actualizar el estado', 'danger');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error de conexión con el servidor', 'danger');
    }
  };

  // Registrar rollo sin imprimir
  const handleAddRolloSubmit = async (e) => {
    e.preventDefault();
    if (!newRollo.numero_rollo.trim() || !newRollo.marca_especificaciones.trim() || !newRollo.ancho_bobina || !newRollo.gramaje) {
      showNotification('Por favor completa todos los datos del rollo.', 'danger');
      return;
    }

    setLoadingAdd(true);

    try {
      const res = await fetch('/api/bobinas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_rollo: newRollo.numero_rollo.trim(),
          marca_especificaciones: newRollo.marca_especificaciones.trim(),
          ancho_bobina: parseFloat(newRollo.ancho_bobina),
          gramaje: parseInt(newRollo.gramaje, 10),
          fecha_produccion_bobina: newRollo.fecha_produccion_bobina,
          porcentaje_humedad: parseFloat(newRollo.porcentaje_humedad) || 5.0,
          estado_bobina: 'Sin Imprimir'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar el rollo');
      }

      showNotification('¡Rollo sin imprimir registrado correctamente!', 'success');
      setNewRollo({
        numero_rollo: '',
        marca_especificaciones: '',
        ancho_bobina: '',
        gramaje: '',
        fecha_produccion_bobina: new Date().toISOString().split('T')[0],
        porcentaje_humedad: '5.0'
      });
      setShowAddModal(false);
      if (onBobinasChanged) onBobinasChanged();
    } catch (err) {
      showNotification(err.message, 'danger');
    } finally {
      setLoadingAdd(false);
    }
  };

  // Filtrar bobinas por pestaña y por inputs de búsqueda
  const filteredBobinas = bobinas.filter(b => {
    // Normalizar estado
    const currentStatus = b.estado_bobina || 'Sin Imprimir';

    // Filtro por pestaña
    if (activeTab !== 'Todos' && currentStatus !== activeTab) {
      // Compatibilidad con registros antiguos 'Almacén'
      if (activeTab === 'Sin Imprimir' && currentStatus === 'Almacén') {
        // Incluir
      } else {
        return false;
      }
    }

    // Filtro por búsqueda de texto
    const matchRollo = b.numero_rollo.toLowerCase().includes(searchRollo.toLowerCase().trim());
    const impresorName = b.flexo_operador || '';
    const matchImpresor = impresorName.toLowerCase().includes(searchImpresor.toLowerCase().trim());
    const impFecha = b.flexo_fecha ? b.flexo_fecha.split(' ')[0] : '';
    const matchFecha = searchFecha ? impFecha === searchFecha : true;

    return matchRollo && matchImpresor && matchFecha;
  });

  // Conteo por etapas
  const counts = {
    sinImprimir: bobinas.filter(b => (b.estado_bobina || 'Sin Imprimir') === 'Sin Imprimir' || b.estado_bobina === 'Almacén').length,
    impreso: bobinas.filter(b => b.estado_bobina === 'Impreso').length,
    utilizado: bobinas.filter(b => b.estado_bobina === 'Utilizado').length,
    cuarentena: bobinas.filter(b => b.estado_bobina === 'Cuarentena').length,
    todos: bobinas.length
  };

  // Estilos de color para badges de estado
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Sin Imprimir':
      case 'Almacén':
        return {
          background: 'rgba(59, 130, 246, 0.12)',
          color: '#2563eb',
          fontWeight: '700'
        };
      case 'Impreso':
        return {
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          fontWeight: '700'
        };
      case 'Utilizado':
        return {
          background: 'rgba(107, 114, 128, 0.15)',
          color: '#4b5563',
          fontWeight: '700'
        };
      case 'Cuarentena':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#d97706',
          fontWeight: '700'
        };
      default:
        return {
          background: 'var(--color-success-bg)',
          color: 'var(--color-success-dark)',
          fontWeight: '700'
        };
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      {/* Encabezado Principal y Botón de Ingreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <div>
          <h2 style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            📦 Inventario y Control de Rollos
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Gestiona el ciclo de vida de los rollos de papel: Sin Imprimir (Almacén) ➔ Impresos (Flexo) ➔ Utilizados (Máquina de Bolsas).
          </span>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowAddModal(true)}
          style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ Ingresar Rollo Sin Imprimir
        </button>
      </div>

      {/* Pestañas de Filtrado por Etapa */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('Sin Imprimir')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'Sin Imprimir' ? 'var(--color-primary)' : '#f3f4f6',
            color: activeTab === 'Sin Imprimir' ? '#ffffff' : '#374151',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📜 Sin Imprimir ({counts.sinImprimir})
        </button>

        <button
          onClick={() => setActiveTab('Impreso')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'Impreso' ? 'var(--color-primary)' : '#f3f4f6',
            color: activeTab === 'Impreso' ? '#ffffff' : '#374151',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🎨 Rollos Impresos ({counts.impreso})
        </button>

        <button
          onClick={() => setActiveTab('Utilizado')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'Utilizado' ? 'var(--color-primary)' : '#f3f4f6',
            color: activeTab === 'Utilizado' ? '#ffffff' : '#374151',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📉 Utilizados ({counts.utilizado})
        </button>

        <button
          onClick={() => setActiveTab('Cuarentena')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'Cuarentena' ? '#d97706' : '#f3f4f6',
            color: activeTab === 'Cuarentena' ? '#ffffff' : '#374151',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚠️ Cuarentena ({counts.cuarentena})
        </button>

        <button
          onClick={() => setActiveTab('Todos')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'Todos' ? '#4b5563' : '#f3f4f6',
            color: activeTab === 'Todos' ? '#ffffff' : '#374151',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📋 Todos ({counts.todos})
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem', background: '#fafafa', padding: '1.25rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Buscar Número de Rollo</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Ej. B-9040" 
            value={searchRollo}
            onChange={(e) => setSearchRollo(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Buscar Impresor (Flexo)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Nombre del impresor" 
            value={searchImpresor}
            onChange={(e) => setSearchImpresor(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Fecha de Impresión</label>
          <input 
            type="date" 
            className="form-control" 
            value={searchFecha}
            onChange={(e) => setSearchFecha(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Bobinas */}
      <div className="table-responsive">
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px 8px' }}>Rollo</th>
              <th style={{ padding: '12px 8px' }}>Ficha Técnica (Papel)</th>
              <th style={{ padding: '12px 8px' }}>Datos de Impresión (Flexo)</th>
              <th style={{ padding: '12px 8px' }}>Fecha Registro</th>
              <th style={{ padding: '12px 8px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredBobinas.length > 0 ? (
              filteredBobinas.map((b) => {
                const status = b.estado_bobina || 'Sin Imprimir';
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '700', color: 'var(--color-primary-light)' }}>
                      <div style={{ fontSize: '1rem' }}>{b.numero_rollo}</div>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', display: 'inline-block', ...getStatusBadgeStyle(status) }}>
                        {status === 'Sin Imprimir' || status === 'Almacén' ? '📜 Sin Imprimir' : status === 'Impreso' ? '🎨 Impreso' : status === 'Utilizado' ? '📉 Utilizado' : '⚠️ Cuarentena'}
                      </span>
                    </td>

                    {/* Ficha Técnica de Materia Prima */}
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '600' }}>{b.marca_especificaciones || 'Sin marca especificada'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'grid', gap: '2px' }}>
                        <span>📏 <strong>Ancho:</strong> {b.ancho_bobina} cm</span>
                        <span>⚖️ <strong>Gramaje:</strong> {b.gramaje} g/m²</span>
                        <span>💧 <strong>Humedad:</strong> {b.porcentaje_humedad}%</span>
                        {b.fecha_produccion_bobina && (
                          <span>📅 <strong>Prod:</strong> {b.fecha_produccion_bobina}</span>
                        )}
                      </div>
                    </td>

                    {/* Datos de Impresión Flexo */}
                    <td style={{ padding: '12px 8px' }}>
                      {b.flexo_operador ? (
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>👤 Impresor: {b.flexo_operador} (Máq: {b.flexo_maquina})</div>
                          <div style={{ marginTop: '4px', color: '#475569', display: 'grid', gap: '2px' }}>
                            <span>🎨 <strong>Tintas:</strong> {b.flexo_numero_tintas || 1} | 🧼 <strong>Lavado:</strong> {b.flexo_ultimo_lavado_grabado || 'N/A'}</span>
                            <span>
                              <strong>Impresión:</strong> {b.flexo_impresion_correcta ? '✅ Correcta' : '❌ Con Defectos'} | 
                              <strong> Registro:</strong> {b.flexo_registro_correcto ? '✅ OK' : '❌ Fallo'}
                            </span>
                            <span>📦 <strong>Estado Físico:</strong> {b.flexo_estado_fisico_rollo || 'Buenas condiciones'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              📅 Auditado: {b.flexo_fecha ? b.flexo_fecha.split(' ')[0] : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {status === 'Sin Imprimir' || status === 'Almacén' 
                            ? '⏳ Pendiente de impresión en Flexo' 
                            : 'Directo a máquina (sin auditoría Flexo)'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {b.fecha_registro ? b.fecha_registro.split(' ')[0] : ''}
                    </td>

                    {/* Selector Manual de Estado */}
                    <td style={{ padding: '12px 8px' }}>
                      <select 
                        value={status === 'Almacén' ? 'Sin Imprimir' : status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          ...getStatusBadgeStyle(status)
                        }}
                      >
                        <option value="Sin Imprimir">📜 Sin Imprimir</option>
                        <option value="Impreso">🎨 Impreso</option>
                        <option value="Utilizado">📉 Utilizado</option>
                        <option value="Cuarentena">⚠️ Cuarentena</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No se encontraron rollos en la etapa "{activeTab}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Ingresar Rollo Sin Imprimir */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>➕ Ingresar Rollo Sin Imprimir</h3>
              <button className="toggle-btn" onClick={() => setShowAddModal(false)} style={{ padding: '4px 8px', fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleAddRolloSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Número de Rollo / Código *</label>
                  <input
                    type="text"
                    value={newRollo.numero_rollo}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, numero_rollo: e.target.value }))}
                    placeholder="Ej. R-8050"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Especificaciones / Marca de Papel *</label>
                  <input
                    type="text"
                    value={newRollo.marca_especificaciones}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, marca_especificaciones: e.target.value }))}
                    placeholder="Ej. Kraft Blanco 80g Starbucks"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ancho (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRollo.ancho_bobina}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, ancho_bobina: e.target.value }))}
                    placeholder="Ej. 80.0"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Gramaje (g/m²) *</label>
                  <input
                    type="number"
                    value={newRollo.gramaje}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, gramaje: e.target.value }))}
                    placeholder="Ej. 90"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Producción *</label>
                  <input
                    type="date"
                    value={newRollo.fecha_produccion_bobina}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, fecha_produccion_bobina: e.target.value }))}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>% Humedad Indicado *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRollo.porcentaje_humedad}
                    onChange={(e) => setNewRollo(prev => ({ ...prev, porcentaje_humedad: e.target.value }))}
                    placeholder="Ej. 5.0"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={loadingAdd}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loadingAdd}>
                  {loadingAdd ? 'Guardando...' : '💾 Guardar Rollo Sin Imprimir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
