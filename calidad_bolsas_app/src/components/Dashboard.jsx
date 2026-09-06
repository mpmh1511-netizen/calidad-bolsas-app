import React, { useState, useEffect } from 'react';

export default function Dashboard({ inspections, selectedArea, onDeleteInspection }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [periodo, setPeriodo] = useState('dia'); // 'dia', 'semana', 'mes', 'ano'
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Extraer todas las fechas únicas de las inspecciones de esa área para armar la línea de tiempo
  useEffect(() => {
    const areaInspections = inspections.filter(ins => ins.area === selectedArea);
    if (areaInspections.length > 0) {
      const dates = areaInspections.map(ins => {
        // La fecha está en formato 'YYYY-MM-DD HH:MM:SS' o ISO
        return ins.fecha_registro.split(' ')[0] || ins.fecha_registro.split('T')[0];
      });
      // Remover duplicados y ordenar descendente
      const uniqueDates = [...new Set(dates)].sort().reverse();
      setAvailableDates(uniqueDates);

      // Por defecto seleccionar la primera fecha (más reciente)
      if (uniqueDates.length > 0 && !selectedDate) {
        setSelectedDate(uniqueDates[0]);
      }
    } else {
      setAvailableDates([]);
      setSelectedDate('');
    }
  }, [inspections, selectedArea]);

  // Filtrar las inspecciones según el periodo y el área seleccionada
  useEffect(() => {
    if (selectedDate) {
      const filtered = inspections.filter(ins => {
        if (ins.area !== selectedArea) return false;
        
        const insDate = ins.fecha_registro.split(' ')[0] || ins.fecha_registro.split('T')[0];
        
        if (periodo === 'dia') {
          return insDate === selectedDate;
        } else if (periodo === 'semana') {
          // Últimos 7 días terminando en la fecha seleccionada
          const selDate = new Date(selectedDate + 'T12:00:00');
          const start = new Date(selDate);
          start.setDate(selDate.getDate() - 6);
          const startStr = start.toISOString().split('T')[0];
          return insDate >= startStr && insDate <= selectedDate;
        } else if (periodo === 'mes') {
          // Mismo mes y año (YYYY-MM)
          const selMonth = selectedDate.substring(0, 7);
          return insDate.startsWith(selMonth);
        } else if (periodo === 'ano') {
          // Mismo año (YYYY)
          const selYear = selectedDate.substring(0, 4);
          return insDate.startsWith(selYear);
        }
        return false;
      });
      setFilteredInspections(filtered);
    } else {
      setFilteredInspections([]);
    }
  }, [selectedDate, periodo, inspections, selectedArea]);

  // Obtener nombre formateado del día para la barra de navegación (e.g. "Hoy", "Ayer", "14 Jul")
  const getDayLabel = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Hoy 📅';
    if (dateStr === yesterdayStr) return 'Ayer';
    
    // Formatear fecha simple (e.g. "12 Jul")
    try {
      const dateParts = dateStr.split('-');
      const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  const getPeriodLabel = () => {
    if (!selectedDate) return '';
    if (periodo === 'dia') return getDayLabel(selectedDate);
    
    if (periodo === 'semana') {
      const selDate = new Date(selectedDate + 'T12:00:00');
      const start = new Date(selDate);
      start.setDate(selDate.getDate() - 6);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `Semana del ${start.getDate()} ${months[start.getMonth()]} al ${selDate.getDate()} ${months[selDate.getMonth()]}`;
    }
    
    if (periodo === 'mes') {
      const dateParts = selectedDate.split('-');
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      try {
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        return `${months[monthIndex]} ${dateParts[0]}`;
      } catch {
        return selectedDate.substring(0, 7);
      }
    }
    
    if (periodo === 'ano') {
      return `Año ${selectedDate.substring(0, 4)}`;
    }
    return selectedDate;
  };

  // --- CÁLCULO DE MÉTRICAS (Para el día seleccionado) ---
  const totalAudits = filteredInspections.length;
  const approvedCount = filteredInspections.filter(i => i.resultado === 'Aprobado').length;
  const rejectedCount = filteredInspections.filter(i => i.resultado === 'Rechazado').length;
  const approvalRate = totalAudits > 0 ? Math.round((approvedCount / totalAudits) * 100) : 0;
  
  // Contar no conformidades (defectos) del día
  const nonConformances = filteredInspections.filter(i => i.resultado === 'Rechazado' && i.descripcion_defecto);

  // Bobinas utilizadas en el día
  const activeBobbins = [...new Set(filteredInspections.map(i => i.numero_rollo))];

  // --- RENDIMIENTO POR MÁQUINA (Para gráficos en CSS) ---
  // Calculamos la tasa de aprobación por máquina en el día seleccionado
  const machineStats = {};
  filteredInspections.forEach(ins => {
    if (!machineStats[ins.maquina]) {
      machineStats[ins.maquina] = { total: 0, approved: 0 };
    }
    machineStats[ins.maquina].total++;
    if (ins.resultado === 'Aprobado') {
      machineStats[ins.maquina].approved++;
    }
  });

  const sortedMachines = Object.keys(machineStats).map(m => {
    const { total, approved } = machineStats[m];
    const rate = Math.round((approved / total) * 100);
    return { name: m, rate, total };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div>
      {/* Selector de Periodo */}
      <div className="period-selector-bar" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          type="button" 
          className={`timeline-day-btn ${periodo === 'dia' ? 'active' : ''}`}
          onClick={() => setPeriodo('dia')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Día 📅
        </button>
        <button 
          type="button" 
          className={`timeline-day-btn ${periodo === 'semana' ? 'active' : ''}`}
          onClick={() => setPeriodo('semana')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Semana 🗓️
        </button>
        <button 
          type="button" 
          className={`timeline-day-btn ${periodo === 'mes' ? 'active' : ''}`}
          onClick={() => setPeriodo('mes')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Mes 📊
        </button>
        <button 
          type="button" 
          className={`timeline-day-btn ${periodo === 'ano' ? 'active' : ''}`}
          onClick={() => setPeriodo('ano')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Año 📈
        </button>
      </div>

      {/* Barra de Selección de Día */}
      <div className="day-selector-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-primary-light)' }}>
            HISTORIAL POR DÍA:
          </span>
          <div className="day-timeline">
            {availableDates.slice(0, 7).map(date => (
              <button
                key={date}
                className={`timeline-day-btn ${selectedDate === date ? 'active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {getDayLabel(date)}
              </button>
            ))}
          </div>
        </div>

        {/* Picker Manual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem' }}>Fecha específica:</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
              }
            }}
            style={{ padding: '6px 12px', fontSize: '0.85rem', width: '150px' }}
          />
        </div>
      </div>

      {totalAudits === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <span style={{ fontSize: '3rem' }}>📁</span>
          <h3 style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No hay inspecciones registradas para esta fecha</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', marginTop: '0.5rem' }}>
            Registra una nueva inspección en la vista del Inspector para ver los reportes aquí.
          </p>
        </div>
      ) : (
        <>
          {/* Indicadores Principales (KPIs) */}
          <div className="kpi-grid">
            <div className="kpi-card primary">
              <label>Inspecciones del Periodo</label>
              <div className="kpi-val">{totalAudits}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auditorías en planta</span>
            </div>

            <div className="kpi-card success">
              <label>Tasa de Aprobación</label>
              <div className="kpi-val">{approvalRate}%</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {approvedCount} de {totalAudits} aprobadas
              </span>
            </div>

            <div className="kpi-card danger">
              <label>Lotes Rechazados</label>
              <div className="kpi-val">{rejectedCount}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Defectos detectados</span>
            </div>

            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(20, 17, 38, 0.8), rgba(43, 37, 82, 0.3))' }}>
              <label>Bobinas en Uso</label>
              <div className="kpi-val" style={{ fontSize: '1.6rem', padding: '8px 0' }}>
                {activeBobbins.length > 0 ? activeBobbins.join(', ') : 'Ninguna'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rollos de papel activos</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            {/* Listado de Auditorías del Día */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="card-title" style={{ marginBottom: '1rem' }}>
                <h3>Auditorías Realizadas ({getPeriodLabel()})</h3>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Área</th>
                      <th>Máquina</th>
                      <th>Operador</th>
                      <th>Bobina</th>
                      <th>Resultado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.map(ins => {
                      const isExpanded = expandedRowId === ins.id;
                      return (
                        <React.Fragment key={ins.id}>
                          <tr 
                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                            onClick={() => setExpandedRowId(isExpanded ? null : ins.id)}
                            className={isExpanded ? 'table-row-active' : ''}
                          >
                            <td style={{ fontWeight: '700' }}>{ins.hora_inspeccion}</td>
                            <td>
                              <span className={`badge area-${ins.area === 'Flexo' ? 'flexo' : ins.area === 'Nanjang' ? 'nanjang' : 'asa'}`}>
                                {ins.area}{ins.es_prueba_carga === 1 ? ' (P. Carga)' : ''}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600' }}>{ins.maquina}</td>
                            <td>{ins.operador}</td>
                            <td>
                              <code style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                                {ins.numero_rollo}
                              </code>
                            </td>
                            <td>
                              <span className={`badge ${ins.resultado.toLowerCase()}`}>
                                {ins.resultado}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className="toggle-btn"
                                  style={{ 
                                    padding: '2px 6px', 
                                    fontSize: '0.8rem', 
                                    background: isExpanded ? 'var(--color-primary-light)' : 'transparent', 
                                    color: isExpanded ? 'white' : 'var(--color-primary)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setExpandedRowId(isExpanded ? null : ins.id)}
                                  title="Ver Detalles"
                                >
                                  {isExpanded ? '🔼' : '👁️'}
                                </button>
                                <button 
                                  className="toggle-btn"
                                  style={{ padding: '2px 6px', color: 'var(--color-danger)', fontSize: '0.8rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                  onClick={() => {
                                    if (window.confirm('¿Seguro que deseas eliminar esta inspección?')) {
                                      onDeleteInspection(ins.id);
                                    }
                                  }}
                                  title="Eliminar"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan="7" style={{ background: 'var(--bg-main)', padding: '15px' }}>
                                <div style={{ 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: 'var(--border-radius-md)', 
                                  background: 'white', 
                                  padding: '1.25rem',
                                  boxShadow: 'var(--box-shadow-sm)'
                                }}>
                                  <h4 style={{ color: 'var(--color-primary)', marginBottom: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Detalles de Auditoría - Rollo: {ins.numero_rollo}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {ins.id}</span>
                                  </h4>
                                  
                                  {ins.area === 'Flexo' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                                      <span><strong>Número de Tintas:</strong> {ins.numero_tintas}</span>
                                      <span><strong>Impresión Correcta:</strong> {ins.impresion_correcta === 1 ? 'Sí' : 'No'}</span>
                                      <span><strong>Registro Correcto:</strong> {ins.registro_correcto === 1 ? 'Sí' : 'No'}</span>
                                      <span><strong>Estado Físico Rollo:</strong> {ins.estado_fisico_rollo}</span>
                                      <span style={{ gridColumn: '1 / -1' }}><strong>Último Lavado/Grabado:</strong> {ins.ultimo_lavado_grabado}</span>
                                    </div>
                                  ) : ins.es_prueba_carga === 1 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                                      <span><strong>Tipo de Prueba:</strong> {ins.carga_tipo_prueba === 'estatica' ? 'Estática (30 min)' : 'Dinámica (15 min)'}</span>
                                      <span><strong>Hora Inicial:</strong> {ins.carga_hora_inicial}</span>
                                      <span><strong>Hora Final:</strong> {ins.carga_hora_final}</span>
                                      <span><strong>Peso Carga:</strong> {ins.carga_peso_kg} kg</span>
                                      <span><strong>Realizado Por:</strong> {ins.carga_realizado_por}</span>
                                      <span><strong>Resultado Prueba:</strong> <span style={{ fontWeight: '700', color: ins.carga_resultado === 'Pasa' ? 'var(--color-success)' : 'var(--color-danger)' }}>{ins.carga_resultado}</span></span>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                                      <span><strong>Pegado Disco:</strong> {ins.pegado_disco === 1 ? 'Correcto ✅' : 'Fallo ❌'}</span>
                                      <span><strong>Pegado Fondo:</strong> {ins.pegado_fondo === 1 ? 'Correcto ✅' : 'Fallo ❌'}</span>
                                      <span><strong>Sin Rebabas Pegamento:</strong> {ins.sin_rebabas_pegamento === 1 ? 'Correcto ✅' : 'Con Rebabas ❌'}</span>
                                      <span><strong>Integridad Papel:</strong> {ins.sin_ruptura_papel === 1 ? 'Sin rupturas ✅' : 'Con rupturas ❌'}</span>
                                      <span><strong>Medidas Coinciden (Marca):</strong> {ins.medidas_coinciden === 1 ? 'Sí ✅' : 'No ❌'}</span>
                                      <span><strong>Estado Gomas Fondo:</strong> {ins.estado_gomas_fondo}</span>
                                      <span><strong>Velocidad Trabajo:</strong> {ins.velocidad_trabajo} ppm</span>
                                      <span><strong>Cantidad Revisada:</strong> {ins.cantidad_revisada} bolsas</span>
                                      
                                      {/* Nuevos parámetros */}
                                      <span><strong>Pegamiento Lineal:</strong> {ins.pegamento_lineal === 1 ? 'Correcto ✅' : 'Fallo ❌'}</span>
                                      <span><strong>Defecto Impresión:</strong> {ins.defecto_impresion === 1 ? 'Presente ❌' : 'Sin Defectos ✅'}</span>
                                      
                                      <span style={{ gridColumn: '1 / -1', background: '#f8f9fa', padding: '8px 12px', borderRadius: '4px', marginTop: '4px' }}>
                                        <strong>Medidas Físicas:</strong> {ins.medida_ancho !== null && ins.medida_ancho !== undefined ? `${ins.medida_ancho}"` : '-'} (Ancho) x {ins.medida_largo !== null && ins.medida_largo !== undefined ? `${ins.medida_largo}"` : '-'} (Largo) x {ins.medida_fuelle !== null && ins.medida_fuelle !== undefined ? `${ins.medida_fuelle}"` : '-'} (Fuelle) 
                                        &nbsp;&bull;&nbsp; <strong>¿Dentro de Parámetro?:</strong> {ins.medidas_dentro_parametro === 1 ? 'Sí ✅' : 'No ❌'}
                                      </span>

                                      {ins.area === 'Con Asa' && (
                                        <>
                                          <hr style={{ gridColumn: '1 / -1', margin: '5px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
                                          <span><strong>Pegado Asa:</strong> {ins.pegamiento_suficiente_asa === 1 ? 'Suficiente ✅' : 'Fallo ❌'}</span>
                                          <span><strong>Pegado Parche:</strong> {ins.pegamiento_suficiente_parche === 1 ? 'Suficiente ✅' : 'Fallo ❌'}</span>
                                          <span><strong>Posición Asa:</strong> {ins.posicion_asa_correcta === 1 ? 'Correcta ✅' : 'Incorrecta ❌'}</span>
                                          <span><strong>Temperatura Pegamento:</strong> {ins.temperatura_pegamento} °C</span>
                                          <span><strong>Pegado Parche Correcto:</strong> {ins.pegado_correcto_parche === 1 ? 'Sí ✅' : 'No ❌'}</span>
                                          <span><strong>Aplicación Hot Melt:</strong> {ins.aplicacion_hot_melt_correcta === 1 ? 'Correcta ✅' : 'Fallo ❌'}</span>
                                          <span><strong>Posición Parche:</strong> {ins.posicion_parche_correcta === 1 ? 'Correcta ✅' : 'Incorrecta ❌'}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  
                                  {ins.resultado === 'Rechazado' && (
                                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)', borderRadius: '4px', padding: '10px' }}>
                                      <span style={{ color: 'var(--color-danger)', fontWeight: '700', display: 'block', marginBottom: '5px' }}>🚨 No Conformidad Registrada:</span>
                                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}><strong>Defecto:</strong> {ins.descripcion_defecto || 'No especificado'}</p>
                                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}><strong>Acción Correctiva:</strong> {ins.accion_correctiva || 'No especificada'}</p>
                                      {ins.foto_url && (
                                        <div style={{ marginTop: '8px' }}>
                                          <a href={ins.foto_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', textDecoration: 'underline' }}>
                                            🖼️ Ver Foto de Evidencia
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rendimiento de Máquinas */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="card-title">
                <h3>Rendimiento</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Tasa de aprobación por máquina en el periodo seleccionado
              </p>
              
              <div className="chart-bar-container">
                {sortedMachines.length > 0 ? (
                  sortedMachines.map(m => (
                    <div className="chart-bar-row" key={m.name}>
                      <span className="chart-bar-label">{m.name}</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width: `${m.rate}%` }}></div>
                      </div>
                      <span className="chart-bar-value">{m.rate}%</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-dark)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                    Sin datos de rendimiento para mostrar
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de Pruebas de Carga por Máquina (Solo Con Asa) */}
          {selectedArea === 'Con Asa' && (
            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
              <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚖️ Resumen de Pruebas de Carga por Máquina
                </h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {['M6', 'M7', 'M8', 'M9', 'M10', 'M11'].map(mach => {
                  const machTests = filteredInspections.filter(i => i.maquina === mach && i.es_prueba_carga === 1);
                  const passed = machTests.filter(i => i.resultado === 'Aprobado').length;
                  const failed = machTests.filter(i => i.resultado === 'Rechazado').length;
                  
                  return (
                    <div key={mach} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>Máquina {mach}</span>
                        <span className="badge" style={{ background: machTests.length > 0 ? 'var(--color-primary)' : 'var(--bg-main)', color: '#fff' }}>
                          {machTests.length} pruebas
                        </span>
                      </div>
                      
                      {machTests.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          Sin pruebas de carga registradas.
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                            <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>Pasan: {passed}</span>
                            <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>Fallan: {failed}</span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                            {machTests.map((t, idx) => {
                              let durText = '0m';
                              if (t.carga_hora_inicial && t.carga_hora_final) {
                                const [h1, m1] = t.carga_hora_inicial.split(':').map(Number);
                                const [h2, m2] = t.carga_hora_final.split(':').map(Number);
                                let dur = (h2 * 60 + m2) - (h1 * 60 + m1);
                                if (dur < 0) dur += 24 * 60;
                                durText = `${dur}m`;
                              }
                              
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                                    <span>{t.carga_tipo_prueba === 'estatica' ? 'Estática ⏱️' : 'Dinámica 🏃'}</span>
                                    <span style={{ color: t.resultado === 'Aprobado' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                      {t.resultado === 'Aprobado' ? 'Pasa' : 'Falla'}
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Peso: {t.carga_peso_kg}kg | Dur: {durText} ({t.carga_hora_inicial}-{t.carga_hora_final})</span>
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Rollo: {t.numero_rollo}</span>
                                    <span style={{ fontStyle: 'italic' }}>Por: {t.carga_realizado_por}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección de No Conformidades y Acciones Correctivas (Fotos) */}
          <div className="card" style={{ marginTop: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ No Conformidades y Acciones Correctivas del Periodo ({nonConformances.length})
              </h3>
            </div>

            {nonConformances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ¡Excelente! No se registraron defectos ni desvíos de calidad en este periodo. 🎉
              </div>
            ) : (
              <div className="defect-grid">
                {nonConformances.map(nc => (
                  <div className="defect-card" key={nc.id}>
                    <div className="defect-card-header">
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{nc.hora_inspeccion} hrs</span>
                        <span className={`badge area-${nc.area === 'Flexo' ? 'flexo' : nc.area === 'Nanjang' ? 'nanjang' : 'asa'}`} style={{ marginLeft: '10px' }}>
                          {nc.area}{nc.es_prueba_carga === 1 ? ' (P. Carga)' : ''} - {nc.maquina}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Op: {nc.operador}</span>
                    </div>
                    
                    <div className="defect-img-container">
                      {nc.foto_url ? (
                        <img 
                          src={nc.foto_url} 
                          alt="Evidencia del defecto" 
                          className="defect-img"
                          onClick={() => window.open(nc.foto_url, '_blank')}
                          style={{ cursor: 'zoom-in' }}
                        />
                      ) : (
                        <div className="no-img-placeholder">
                          <span>📷 Sin Imagen Cargada</span>
                          <span style={{ fontSize: '0.7rem' }}>Solo reporte escrito</span>
                        </div>
                      )}
                    </div>

                    <div className="defect-card-body">
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>Defecto Detectado</label>
                        <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#fff', marginTop: '4px' }}>
                          {nc.descripcion_defecto}
                        </p>
                      </div>
                      
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>Acción Correctiva</label>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                          {nc.accion_correctiva}
                        </p>
                      </div>

                       {nc.es_prueba_carga === 1 && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Fallo en Carga:</strong> {nc.carga_peso_kg}kg | {nc.carga_tipo_prueba} | {nc.carga_realizado_por} | {nc.carga_resultado}
                        </div>
                      )}
                      
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Bobina:</strong> {nc.numero_rollo} ({nc.marca_especificaciones})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
