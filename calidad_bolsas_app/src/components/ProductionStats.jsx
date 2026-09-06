import React, { useState, useEffect } from 'react';

export default function ProductionStats() {
  const [periodo, setPeriodo] = useState('dia'); // 'dia', 'semana', 'mes', 'ano'
  const [selectedMachine, setSelectedMachine] = useState(''); // Formato: "Tipo-Maquina" (ej: "Flexo-M1")
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generar lista de máquinas para el selector
  const maquinasOpciones = [
    { label: 'Todas las Máquinas', value: '' },
    { label: 'Flexo M1', value: 'Flexo-M1' },
    { label: 'Flexo M2', value: 'Flexo-M2' },
    { label: 'Flexo M3', value: 'Flexo-M3' },
    { label: 'Flexo M4', value: 'Flexo-M4' },
    ...['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'].map(m => ({
      label: `Armado ${m}`,
      value: `Armado-${m}`
    }))
  ];

  useEffect(() => {
    fetchStats();
  }, [periodo, selectedMachine]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/produccion/estadisticas?periodo=${periodo}`;
      if (selectedMachine) {
        const [tipo, maq] = selectedMachine.split('-');
        url += `&tipo_maquina=${tipo}&maquina=${maq}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      } else {
        setError('Error al obtener datos estadísticos del servidor.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <span>⏳ Cargando estadísticas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', border: '1px solid var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' }}>
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button className="btn-secondary" onClick={fetchStats} style={{ marginTop: '1rem' }}>🔄 Reintentar</button>
      </div>
    );
  }

  if (!data) return null;

  const { resumen, desglose_maquinas, linea_tiempo } = data;
  const prodTotal = resumen.total_producido || 0;
  const tarimaTotal = resumen.total_tarima || 0;
  const metaTotal = resumen.total_meta || 0;
  const descarteTotal = prodTotal - tarimaTotal;
  
  const yieldPct = prodTotal > 0 ? (tarimaTotal / prodTotal) * 100 : 0;
  const progressPct = metaTotal > 0 ? (prodTotal / metaTotal) * 100 : 0;

  // Encontrar el valor más alto en la línea de tiempo para escalar el gráfico SVG
  const maxVal = Math.max(...linea_tiempo.map(item => Math.max(item.total_producido, item.total_meta)), 10000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Selectores de Filtro y Periodo */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Selector de Máquina */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Filtrar por Máquina</label>
            <select
              className="form-control"
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              style={{ width: '220px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}
            >
              {maquinasOpciones.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Selector de Periodo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginLeft: '4px' }}>Periodo de Consulta</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              {['dia', 'semana', 'mes', 'ano'].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`btn-secondary ${periodo === p ? 'active-tab' : ''}`}
                  onClick={() => setPeriodo(p)}
                  style={{
                    padding: '8px 18px',
                    background: periodo === p ? 'var(--color-primary)' : '',
                    color: periodo === p ? '#fff' : '',
                    textTransform: 'capitalize'
                  }}
                >
                  {p === 'ano' ? 'Año' : p === 'dia' ? 'Día' : p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* KPI 1: Bolsas Producidas */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Bolsas Producidas (Máquina)</span>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary)' }}>
            {prodTotal.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total de bolsas procesadas
          </span>
        </div>

        {/* KPI 2: Aprobadas en Tarima */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Aprobadas (En Tarima)</span>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-success)' }}>
            {tarimaTotal.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-success-dark)', fontWeight: '600' }}>
            Rendimiento: {yieldPct.toFixed(1)}%
          </span>
        </div>

        {/* KPI 3: Avance de Meta */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Avance de Meta General</span>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#4f46e5' }}>
            {progressPct.toFixed(1)}%
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Meta Total: {metaTotal.toLocaleString()}
          </span>
        </div>

        {/* KPI 4: Descarte */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Descarte / Desperdicio</span>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-danger)' }}>
            {descarteTotal.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-danger-dark)', fontWeight: '600' }}>
            Tasa: {prodTotal > 0 ? ((descarteTotal / prodTotal) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      {/* Gráfico SVG de Tendencia */}
      {linea_tiempo.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
            Línea de Tiempo: Producción Real vs Meta Fijada
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '600px', padding: '10px 0' }}>
              <svg viewBox="0 0 800 220" width="100%" height="220" style={{ overflow: 'visible' }}>
                {/* Líneas de cuadrícula horizontales */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 170 - ratio * 140;
                  const labelVal = Math.round((ratio * maxVal));
                  return (
                    <g key={idx}>
                      <line x1="50" y1={y} x2="780" y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                      <text x="5" y={y + 4} fontSize="9" fill="var(--text-muted)">{labelVal.toLocaleString()}</text>
                    </g>
                  );
                })}

                {/* Graficar barras de Meta y Real */}
                {linea_tiempo.map((item, idx) => {
                  const step = 730 / linea_tiempo.length;
                  const x = 70 + idx * step;
                  
                  // Alturas proporcionales
                  const metaHeight = (item.total_meta / maxVal) * 140;
                  const prodHeight = (item.total_producido / maxVal) * 140;

                  // Coordenadas Y
                  const metaY = 170 - metaHeight;
                  const prodY = 170 - prodHeight;

                  return (
                    <g key={item.periodo}>
                      {/* Barra Meta (Gris azulado) */}
                      <rect 
                        x={x} 
                        y={metaY} 
                        width={step * 0.35} 
                        height={metaHeight} 
                        fill="#cbd5e1" 
                        rx="2"
                        title={`Meta: ${item.total_meta}`}
                      />
                      
                      {/* Barra Real (Color Primario) */}
                      <rect 
                        x={x + step * 0.4} 
                        y={prodY} 
                        width={step * 0.35} 
                        height={prodHeight} 
                        fill="var(--color-primary-light)" 
                        rx="2"
                        title={`Real: ${item.total_producido}`}
                      />

                      {/* Etiqueta del periodo en X */}
                      <text 
                        x={x + step * 0.35} 
                        y="190" 
                        fontSize="9" 
                        textAnchor="middle" 
                        fill="var(--text-muted)" 
                        transform={`rotate(-25, ${x + step * 0.35}, 190)`}
                      >
                        {(() => {
                          const p = item.periodo;
                          if (p.includes(' ')) {
                            const [datePart, timePart] = p.split(' ');
                            const [, m, d] = datePart.split('-');
                            return `${d}/${m} ${timePart}`;
                          }
                          return p.split('-').reverse().join('/');
                        })()}
                      </text>
                    </g>
                  );
                })}

                {/* Eje X */}
                <line x1="50" y1="170" x2="780" y2="170" stroke="#cbd5e1" strokeWidth="2" />
              </svg>
              
              {/* Leyenda */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#cbd5e1', borderRadius: '2px' }} />
                  <span>Meta Fijada (Bolsas)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--color-primary-light)', borderRadius: '2px' }} />
                  <span>Producción Realizada (Máquina)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Desglose por Máquina */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>Rendimiento Acumulado por Máquina</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desglose de metas y producción acumuladas por equipo</span>
        </div>

        {desglose_maquinas.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
            <span>📭 No hay datos acumulados en este periodo.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Máquina</th>
                  <th>Meta Acumulada</th>
                  <th>Producción Real</th>
                  <th>Avance de Meta</th>
                  <th>Bolsas en Tarima</th>
                  <th>Descarte</th>
                  <th>% Calidad</th>
                </tr>
              </thead>
              <tbody>
                {desglose_maquinas.map(row => {
                  const prod = row.total_producido || 0;
                  const tarima = row.total_tarima || 0;
                  const meta = row.total_meta || 0;
                  const descarte = prod - tarima;
                  const progress = meta > 0 ? (prod / meta) * 100 : 0;
                  const quality = prod > 0 ? (tarima / prod) * 100 : 0;

                  let progressColor = 'var(--text-muted)';
                  let progressBg = '#f1f5f9';
                  if (meta > 0) {
                    if (progress >= 100) {
                      progressColor = 'var(--color-primary)';
                      progressBg = 'rgba(79, 70, 229, 0.1)';
                    } else if (progress >= 90) {
                      progressColor = 'var(--color-success-dark)';
                      progressBg = 'var(--color-success-bg)';
                    } else if (progress >= 75) {
                      progressColor = 'rgba(245, 158, 11, 1)';
                      progressBg = 'rgba(245, 158, 11, 0.15)';
                    } else {
                      progressColor = 'var(--color-danger-dark)';
                      progressBg = 'var(--color-danger-bg)';
                    }
                  }

                  let qualColor = 'var(--text-muted)';
                  let qualBg = '#f1f5f9';
                  if (prod > 0) {
                    if (quality >= 95) {
                      qualColor = 'var(--color-success-dark)';
                      qualBg = 'var(--color-success-bg)';
                    } else if (quality >= 90) {
                      qualColor = 'rgba(245, 158, 11, 1)';
                      qualBg = 'rgba(245, 158, 11, 0.15)';
                    } else {
                      qualColor = 'var(--color-danger-dark)';
                      qualBg = 'var(--color-danger-bg)';
                    }
                  }

                  return (
                    <tr key={`${row.tipo_maquina}-${row.maquina}`}>
                      <td style={{ fontWeight: '700' }}>
                        <span className={`badge area-${row.tipo_maquina === 'Flexo' ? 'flexo' : 'nanjang'}`} style={{ marginRight: '6px' }}>
                          {row.tipo_maquina}
                        </span>
                        {row.maquina}
                      </td>
                      <td>{meta > 0 ? meta.toLocaleString() : '-'}</td>
                      <td>{prod.toLocaleString()}</td>
                      <td>
                        {meta > 0 ? (
                          <span className="badge" style={{ background: progressBg, color: progressColor, fontWeight: '700' }}>
                            {progress.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{tarima.toLocaleString()}</td>
                      <td style={{ color: descarte > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                        {descarte > 0 ? descarte.toLocaleString() : '-'}
                      </td>
                      <td>
                        {prod > 0 ? (
                          <span className="badge" style={{ background: qualBg, color: qualColor, fontWeight: '700' }}>
                            {quality.toFixed(1)}%
                          </span>
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
  );
}
