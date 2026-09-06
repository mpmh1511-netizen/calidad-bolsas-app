import React, { useState, useEffect } from 'react';

const MAQUINAS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'Banda 1', 'Banda 2', 'Banda 3', 'Banda 4'];

export default function TarimaForm({ bobinas, onBobinasChanged, showNotification, isFrias, bandaInicial }) {
  const [activeTab, setActiveTab] = useState('registro'); // 'registro' o 'consulta'
  const [maquina, setMaquina] = useState(bandaInicial || (isFrias ? 'Banda 1' : 'M1'));
  const [numeroRollo, setNumeroRollo] = useState('');
  const [matchedBobina, setMatchedBobina] = useState(null);
  const [tarimaCorrecta, setTarimaCorrecta] = useState(true);
  const [etiquetadoCorrecto, setEtiquetadoCorrecto] = useState(true);
  const [bolsasCumplen, setBolsasCumplen] = useState(true);
  const [cintaCorrecta, setCintaCorrecta] = useState(true);
  const [operador, setOperador] = useState('');
  const [estadoLiberacion, setEstadoLiberacion] = useState('Liberado'); // 'Liberado', 'Condicionado', 'Rechazado'
  const [motivo, setMotivo] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Estados para registro manual de bobina en caliente
  const [showManualBobina, setShowManualBobina] = useState(false);
  const [manualMarca, setManualMarca] = useState('');
  const [manualAncho, setManualAncho] = useState('');
  const [manualGramaje, setManualGramaje] = useState('');
  const [manualHumedad, setManualHumedad] = useState('');
  const [manualFechaProd, setManualFechaProd] = useState(new Date().toISOString().split('T')[0]);
  const [manualFechaImp, setManualFechaImp] = useState(new Date().toISOString().split('T')[0]);
  const [manualMaquinaFlexo, setManualMaquinaFlexo] = useState('Flexo 1');
  const [manualOperadorFlexo, setManualOperadorFlexo] = useState('');

  // Búsqueda de Tarima
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Buscar bobina activa
  useEffect(() => {
    if (!numeroRollo.trim()) {
      setMatchedBobina(null);
      setShowManualBobina(false);
      return;
    }
    const match = bobinas.find(
      (b) => b.numero_rollo.toLowerCase() === numeroRollo.trim().toLowerCase()
    );
    setMatchedBobina(match || null);
    if (!match) {
      setShowManualBobina(true);
    } else {
      setShowManualBobina(false);
    }
  }, [numeroRollo, bobinas]);

  // Manejar cambio de foto con compresión opcional
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/') || file.size < 800 * 1024) {
        return resolve(file);
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], (file.name || 'evidencia_tarima').replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const processedFile = await compressImage(file);
      setFoto(processedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(processedFile);
    }
  };

  // Enviar formulario de liberación
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isFriasTarima = maquina.startsWith('Banda') || maquina === 'Frías' || isFrias;
    let rolloToSave = numeroRollo.trim();

    if (!operador.trim()) {
      showNotification('Especifica el operador que realiza la liberación.', 'danger');
      return;
    }
    if (!isFriasTarima && !rolloToSave) {
      showNotification('Ingresa un número de rollo.', 'danger');
      return;
    }
    if (isFriasTarima && !rolloToSave) {
      rolloToSave = 'FRÍAS';
    }
    if ((estadoLiberacion === 'Condicionado' || estadoLiberacion === 'Rechazado') && !motivo.trim()) {
      showNotification('Debe ingresar un motivo para el estado condicionado o rechazado.', 'danger');
      return;
    }

    setIsLoading(true);
    try {
      let activeBobinaId = matchedBobina ? matchedBobina.id : null;

      if (!matchedBobina && !isFriasTarima) {
        if (!manualMarca.trim() || !manualAncho.trim() || !manualGramaje.trim() || !manualHumedad.trim() || !manualFechaProd || !manualFechaImp || !manualOperadorFlexo.trim()) {
          showNotification('Por favor complete todos los campos obligatorios del registro manual de bobina.', 'danger');
          setIsLoading(false);
          return;
        }

        // 1. Registrar la bobina física
        const bobinaRes = await fetch('/api/bobinas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_rollo: numeroRollo.trim(),
            marca_especificaciones: manualMarca.trim(),
            ancho_bobina: parseFloat(manualAncho),
            gramaje: parseInt(manualGramaje, 10),
            fecha_produccion_bobina: manualFechaProd,
            porcentaje_humedad: parseFloat(manualHumedad)
          })
        });

        if (!bobinaRes.ok) {
          const errData = await bobinaRes.json();
          showNotification(errData.error || 'Error al registrar la bobina manualmente', 'danger');
          setIsLoading(false);
          return;
        }

        const savedBobina = await bobinaRes.json();
        activeBobinaId = savedBobina.id;

        // 2. Registrar la inspección simulada de Flexo
        const flexoSimulatedRes = await fetch('/api/inspecciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: JSON.stringify({
              bobina_id: activeBobinaId,
              area: 'Flexo',
              maquina: manualMaquinaFlexo,
              hora_inspeccion: '12:00',
              operador: manualOperadorFlexo.trim(),
              tiene_print_card: 1,
              resultado: 'Aprobado',
              observaciones: 'Registro manual en caliente desde liberación de tarimas',
              numero_tintas: 1,
              impresion_correcta: 1,
              registro_correcto: 1,
              estado_fisico_rollo: 'Buenas condiciones',
              ultimo_lavado_grabado: new Date().toISOString().split('T')[0],
              fecha_registro: manualFechaImp + ' 12:00:00'
            })
          })
        });

        if (!flexoSimulatedRes.ok) {
          const errData = await flexoSimulatedRes.json();
          showNotification(errData.error || 'Error al registrar la inspección simulada de Flexo', 'danger');
          setIsLoading(false);
          return;
        }

        // Avisar al componente padre que se agregaron nuevas bobinas
        if (onBobinasChanged) {
          onBobinasChanged();
        }
      }

      const formData = new FormData();
      formData.append('maquina', maquina);
      formData.append('numero_rollo', numeroRollo.trim());
      formData.append('bobina_id', activeBobinaId);
      formData.append('tarima_correcta', tarimaCorrecta);
      formData.append('etiquetado_correcto', etiquetadoCorrecto);
      formData.append('bolsas_cumplen', bolsasCumplen);
      formData.append('cinta_correcta', cintaCorrecta);
      formData.append('operador', operador);
      formData.append('estado_liberacion', estadoLiberacion);
      formData.append('motivo', (estadoLiberacion === 'Condicionado' || estadoLiberacion === 'Rechazado') ? motivo : '');
      if (foto) {
        formData.append('foto', foto);
      }

      const res = await fetch('/api/tarimas', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCode(data.codigo_liberacion);
        showNotification('¡Tarima liberada exitosamente!', 'success');
        
        // Limpiar formulario parcial
        setNumeroRollo('');
        setMotivo('');
        setEstadoLiberacion('Liberado');
        setFoto(null);
        setFotoPreview('');
        setCintaCorrecta(true);
        setManualMarca('');
        setManualAncho('');
        setManualGramaje('');
        setManualHumedad('');
        setManualOperadorFlexo('');
      } else {
        const errText = await res.text();
        let errMsg = 'Error al liberar tarima';
        try {
          const errData = JSON.parse(errText);
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {
          if (errText) {
            const cleanText = errText.replace(/<[^>]*>?/gm, '').trim();
            if (cleanText) errMsg = cleanText.substring(0, 150);
          }
        }
        showNotification(errMsg, 'danger');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error de conexión con el servidor', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar tarima por código
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearchResult(null);
    setSearchError('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/tarimas/buscar/${searchCode.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        const errData = await res.json();
        setSearchError(errData.error || 'No se encontró la tarima');
      }
    } catch (err) {
      setSearchError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar código al portapapeles
  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    showNotification('Código copiado al portapapeles 📋', 'success');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Sub-Navegación */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
        <span 
          onClick={() => setActiveTab('registro')}
          style={{
            cursor: 'pointer',
            fontWeight: activeTab === 'registro' ? '700' : '600',
            borderBottom: activeTab === 'registro' ? '2px solid var(--color-primary)' : 'none',
            paddingBottom: '8px',
            color: activeTab === 'registro' ? 'var(--text-main)' : 'var(--text-muted)'
          }}
        >
          📦 Registrar Liberación de Tarima
        </span>
        <span 
          onClick={() => setActiveTab('consulta')}
          style={{
            cursor: 'pointer',
            fontWeight: activeTab === 'consulta' ? '700' : '600',
            borderBottom: activeTab === 'consulta' ? '2px solid var(--color-primary)' : 'none',
            paddingBottom: '8px',
            color: activeTab === 'consulta' ? 'var(--text-main)' : 'var(--text-muted)'
          }}
        >
          🔍 Consultar Tarima Liberada
        </span>
      </div>

      {activeTab === 'registro' ? (
        <div className="card" style={{ padding: '2rem' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h2 style={{ color: 'var(--color-primary)' }}>Liberación de Tarimas</h2>
          </div>

          {generatedCode && (
            <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', padding: '1.25rem', borderRadius: 'var(--border-radius-md)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '600' }}>¡Liberación Exitosa! Código Generado:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-success-dark)', fontFamily: 'monospace' }}>{generatedCode}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={handleCopyCode} style={{ background: 'var(--color-success)' }}>
                  Copiar Código 📋
                </button>
                <button className="btn-secondary" onClick={() => setGeneratedCode('')}>
                  Aceptar
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Máquina de Confección</label>
                <select 
                  className="form-control"
                  value={maquina}
                  onChange={(e) => setMaquina(e.target.value)}
                >
                  {MAQUINAS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Operador Inspector/Responsable</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Número de Rollo (Bobina Activa)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={numeroRollo}
                  onChange={(e) => setNumeroRollo(e.target.value)}
                  placeholder="Ej: R-1002"
                  list="tarimas-bobinas-list"
                  required
                />
                <datalist id="tarimas-bobinas-list">
                  {bobinas.map(b => (
                    <option key={b.id} value={b.numero_rollo} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Ficha técnica del rollo */}
            <div style={{ margin: '1.5rem 0' }}>
              {matchedBobina ? (
                <div style={{ padding: '1.25rem', border: '1px solid var(--color-success)', background: 'var(--color-success-bg)', borderRadius: 'var(--border-radius-md)' }}>
                  <span style={{ fontWeight: '700', color: 'var(--color-success)', display: 'block', marginBottom: '8px' }}>
                    ✅ Bobina Encontrada: {matchedBobina.marca_especificaciones || matchedBobina.marca_specifications}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <span><strong>Ancho:</strong> {matchedBobina.ancho_bobina} cm</span>
                    <span><strong>Gramaje:</strong> {matchedBobina.gramaje} g</span>
                    <span><strong>Humedad:</strong> {matchedBobina.porcentaje_humedad}%</span>
                    {matchedBobina.flexo_fecha && (
                      <span style={{ gridColumn: '1 / -1', color: 'var(--color-primary-light)', fontWeight: '600', marginTop: '5px' }}>
                        📅 Registrado en Flexo el: {matchedBobina.flexo_fecha.split(' ')[0]} por {matchedBobina.flexo_operador} (Máq: {matchedBobina.flexo_maquina})
                      </span>
                    )}
                  </div>
                </div>
              ) : numeroRollo.trim() ? (
                <div style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.03)', borderRadius: 'var(--border-radius-md)' }}>
                  <span style={{ fontWeight: '700', color: 'rgba(245, 158, 11, 1)', display: 'block', marginBottom: '8px' }}>
                    ⚠️ Rollo no registrado en Flexo
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                    Ingrese los datos de impresión y bobina manualmente para realizar el registro en caliente.
                  </p>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Marca / Especificaciones *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={manualMarca} 
                        onChange={(e) => setManualMarca(e.target.value)} 
                        placeholder="Ej. Starbucks Kraft M" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Ancho de bobina (cm) *</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        value={manualAncho} 
                        onChange={(e) => setManualAncho(e.target.value)} 
                        placeholder="Ej. 80" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Gramaje (g/m²) *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={manualGramaje} 
                        onChange={(e) => setManualGramaje(e.target.value)} 
                        placeholder="Ej. 90" 
                      />
                    </div>
                    <div className="form-group">
                      <label>% Humedad *</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        value={manualHumedad} 
                        onChange={(e) => setManualHumedad(e.target.value)} 
                        placeholder="Ej. 5.5" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Producción Bobina *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={manualFechaProd} 
                        onChange={(e) => setManualFechaProd(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Impresión (Flexo) *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={manualFechaImp} 
                        onChange={(e) => setManualFechaImp(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label>Máquina de Impresión (Flexo) *</label>
                      <select 
                        className="form-control" 
                        value={manualMaquinaFlexo} 
                        onChange={(e) => setManualMaquinaFlexo(e.target.value)}
                      >
                        <option value="Flexo 1">Flexo 1</option>
                        <option value="Flexo 2">Flexo 2</option>
                        <option value="Flexo 3">Flexo 3</option>
                        <option value="Flexo 4">Flexo 4</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Impresor (Operador de Flexo) *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={manualOperadorFlexo} 
                        onChange={(e) => setManualOperadorFlexo(e.target.value)} 
                        placeholder="Nombre del impresor" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', background: '#fafafa', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Escribe el número de rollo registrado en Flexo para autocompletar la ficha técnica.
                </div>
              )}
            </div>

            <hr style={{ border: 'none', height: '1px', background: 'var(--border-color)', margin: '1.5rem 0' }} />

            {/* Checklist de liberación */}
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Checklist de Verificación</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>¿Es la tarima correcta?</label>
                <div className="toggle-group">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tarimaCorrecta ? 'Sí' : 'No'}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={tarimaCorrecta} 
                      onChange={(e) => setTarimaCorrecta(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>¿Tiene el etiquetado correcto?</label>
                <div className="toggle-group">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{etiquetadoCorrecto ? 'Sí' : 'No'}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={etiquetadoCorrecto} 
                      onChange={(e) => setEtiquetadoCorrecto(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>¿Bolsas cumplen condiciones necesarias?</label>
                <div className="toggle-group">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasCumplen ? 'Sí' : 'No'}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={bolsasCumplen} 
                      onChange={(e) => setBolsasCumplen(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>¿Tiene la cinta correctamente pegada?</label>
                <div className="toggle-group">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cintaCorrecta ? 'Sí' : 'No'}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={cintaCorrecta} 
                      onChange={(e) => setCintaCorrecta(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', height: '1px', background: 'var(--border-color)', margin: '1.5rem 0' }} />

            {/* Estado de la Liberación */}
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Dictamen de la Tarima</h3>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Estado de Liberación</label>
                <div className="result-selector" style={{ display: 'flex', gap: '15px' }}>
                  <div 
                    className={`result-card aprobado ${estadoLiberacion === 'Liberado' ? 'active' : ''}`}
                    onClick={() => setEstadoLiberacion('Liberado')}
                    style={{ flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', borderRadius: 'var(--border-radius-md)', fontWeight: '700', border: '2px solid var(--border-color)' }}
                  >
                    Liberado ✅
                  </div>
                  <div 
                    className={`result-card ${estadoLiberacion === 'Condicionado' ? 'active' : ''}`}
                    onClick={() => setEstadoLiberacion('Condicionado')}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      borderRadius: 'var(--border-radius-md)', 
                      fontWeight: '700', 
                      border: '2px solid var(--border-color)',
                      background: estadoLiberacion === 'Condicionado' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      borderColor: estadoLiberacion === 'Condicionado' ? 'rgba(245, 158, 11, 1)' : 'var(--border-color)',
                      color: estadoLiberacion === 'Condicionado' ? 'rgba(245, 158, 11, 1)' : 'var(--text-main)'
                    }}
                  >
                    Condicionado ⚠️
                  </div>
                  <div 
                    className={`result-card rechazado ${estadoLiberacion === 'Rechazado' ? 'active' : ''}`}
                    onClick={() => setEstadoLiberacion('Rechazado')}
                    style={{ flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', borderRadius: 'var(--border-radius-md)', fontWeight: '700', border: '2px solid var(--border-color)' }}
                  >
                    Rechazado ❌
                  </div>
                </div>
              </div>

              {(estadoLiberacion === 'Condicionado' || estadoLiberacion === 'Rechazado') && (
                <div className="form-group">
                  <label>Motivo de la Condición o Rechazo</label>
                  <textarea 
                    className="form-control"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Describe detalladamente los motivos..."
                    rows="3"
                    required
                  />
                </div>
              )}
            </div>

            <hr style={{ border: 'none', height: '1px', background: 'var(--border-color)', margin: '1.5rem 0' }} />

            {/* Carga de fotos de evidencia */}
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Evidencia de Acomodo Correcto</h3>
            
            <div className="form-group">
              <label>Subir Foto del Acomodo</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFotoChange}
                  style={{ display: 'none' }}
                  id="tarima-foto-upload"
                />
                <label htmlFor="tarima-foto-upload" className="btn-secondary" style={{ cursor: 'pointer' }}>
                  📷 Cargar Imagen
                </label>
                {fotoPreview && (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={fotoPreview} 
                      alt="Preview del acomodo" 
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => { setFoto(null); setFotoPreview(''); }}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ marginTop: '2rem', width: '100%', padding: '12px', fontSize: '1rem', justifyContent: 'center' }}
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : '💾 Liberar Tarima y Generar Código'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem' }}>
          <div className="card-title" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h2 style={{ color: 'var(--color-primary)' }}>Consultar Tarima Liberada</h2>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
            <input 
              type="text" 
              className="form-control" 
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Ingresa el código (ej: 14_07_M6_1)"
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </form>

          {searchError && (
            <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-danger)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              ❌ {searchError}
            </div>
          )}

          {searchResult && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--color-primary-light)', padding: '1rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '1.2rem', fontFamily: 'monospace' }}>Código: {searchResult.codigo_liberacion}</span>
                <span style={{ fontSize: '0.85rem' }}>F. Registro: {searchResult.fecha_registro}</span>
              </div>

              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: searchResult.evidencia_acomodo_url ? '1.5fr 1fr' : '1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Inspector/Operador</span>
                    <strong style={{ fontSize: '1rem' }}>{searchResult.operador}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Máquina de Confección</span>
                    <strong style={{ fontSize: '1rem' }}>{searchResult.maquina}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Número de Rollo (Bobina)</span>
                    <strong style={{ fontSize: '1rem' }}>{searchResult.numero_rollo}</strong>
                    {searchResult.marca_especificaciones && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                        Ficha: {searchResult.marca_especificaciones} (Ancho: {searchResult.ancho_bobina}cm | Gramaje: {searchResult.gramaje}g | Humedad: {searchResult.porcentaje_humedad}%)
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Dictamen de la Tarima</span>
                    <span 
                      style={{ 
                        display: 'inline-block',
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontWeight: '700', 
                        fontSize: '0.9rem',
                        marginTop: '4px',
                        background: searchResult.estado_liberacion === 'Liberado' ? 'var(--color-success-bg)' : searchResult.estado_liberacion === 'Condicionado' ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-danger-bg)',
                        color: searchResult.estado_liberacion === 'Liberado' ? 'var(--color-success-dark)' : searchResult.estado_liberacion === 'Condicionado' ? 'rgba(245, 158, 11, 1)' : 'var(--color-danger-dark)'
                      }}
                    >
                      {searchResult.estado_liberacion}
                    </span>
                  </div>

                  {searchResult.motivo && (
                    <div style={{ background: 'rgba(0, 0, 0, 0.02)', padding: '10px', borderRadius: 'var(--border-radius-md)', borderLeft: '3px solid var(--color-primary-light)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Motivo de la Condición / Rechazo:</span>
                      <p style={{ fontSize: '0.9rem', margin: '4px 0 0 0', fontStyle: 'italic' }}>{searchResult.motivo}</p>
                    </div>
                  )}

                  <hr style={{ border: 'none', height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />

                  {/* Checklist */}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>Checklist Verificado:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                        <span>¿Tarima Correcta?</span>
                        <span style={{ fontWeight: '600', color: searchResult.tarima_correcta === 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {searchResult.tarima_correcta === 1 ? 'Sí ✅' : 'No ❌'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                        <span>¿Etiquetado Correcto?</span>
                        <span style={{ fontWeight: '600', color: searchResult.etiquetado_correcto === 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {searchResult.etiquetado_correcto === 1 ? 'Sí ✅' : 'No ❌'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                        <span>¿Bolsas Cumplen Condiciones?</span>
                        <span style={{ fontWeight: '600', color: searchResult.bolsas_cumplen === 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {searchResult.bolsas_cumplen === 1 ? 'Sí ✅' : 'No ❌'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                        <span>¿Cinta Correctamente Pegada?</span>
                        <span style={{ fontWeight: '600', color: searchResult.cinta_correcta === 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {searchResult.cinta_correcta === 1 ? 'Sí ✅' : 'No ❌'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {searchResult.evidencia_acomodo_url && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Evidencia del Acomodo</span>
                    <img 
                      src={searchResult.evidencia_acomodo_url} 
                      alt="Evidencia acomodo" 
                      style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: '#fafafa', cursor: 'zoom-in' }}
                      onClick={() => window.open(searchResult.evidencia_acomodo_url, '_blank')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
