import React, { useState, useEffect, useRef } from 'react';

const MAQUINAS_FLEXO = ['Flexo 1', 'Flexo 2', 'Flexo 3', 'Flexo 4'];
const MAQUINAS_NANJANG = ['M1', 'M2', 'M3', 'M4', 'M5'];
const MAQUINAS_ASA = ['M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
const MAQUINAS_FRIAS = ['Banda 1', 'Banda 2', 'Banda 3', 'Banda 4'];

export default function InspectionForm({ bobinas, inspections, initialArea, role, onInspectionSaved, showNotification }) {
  const [area, setArea] = useState(initialArea || 'Flexo');
  const [maquina, setMaquina] = useState('');
  const [hora, setHora] = useState('');
  const [operador, setOperador] = useState('');
  const [tienePrintCard, setTienePrintCard] = useState(true);
  const [resultado, setResultado] = useState('Aprobado');
  const [observaciones, setObservaciones] = useState('');

  // Registro de Bobina en Flexo
  const [bobinaFlexoData, setBobinaFlexoData] = useState({
    numero_rollo: '',
    marca_especificaciones: '',
    ancho_bobina: '80',
    gramaje: '90',
    fecha_produccion_bobina: new Date().toISOString().split('T')[0],
    porcentaje_humedad: '5.0'
  });
  const [cargaData, setCargaData] = useState({
    carga_tipo_prueba: 'estatica',
    carga_hora_inicial: '',
    carga_hora_final: '',
    carga_peso_kg: '5',
    carga_realizado_por: 'inspector',
    carga_resultado: 'Pasa'
  });

  // Inicializar horas de prueba de carga por defecto
  useEffect(() => {
    const now = new Date();
    const formattedNow = now.toTimeString().split(' ')[0].substring(0, 5);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const formattedAgo = thirtyMinsAgo.toTimeString().split(' ')[0].substring(0, 5);
    
    setCargaData(prev => ({
      ...prev,
      carga_hora_inicial: formattedAgo,
      carga_hora_final: formattedNow
    }));
  }, []);

  // Búsqueda de Bobina en Bolsas
  const [bolsaRolloInput, setBolsaRolloInput] = useState('');
  const [matchedBobina, setMatchedBobina] = useState(null);

  // Estados Flexo (Calidad)
  const [flexoData, setFlexoData] = useState({
    numero_tintas: '2',
    impresion_correcta: true,
    registro_correcto: true,
    estado_fisico_rollo: 'Buenas condiciones',
    ultimo_lavado_grabado: new Date().toISOString().split('T')[0]
  });

  // Estado Frías Simplificado
  const [friasData, setFriasData] = useState({
    bolsa_buenas_condiciones: true,
    marca_especificaciones: ''
  });

  // Estados Bolsas (Nanjang / Con Asa)
  const [bolsasData, setBolsasData] = useState({
    pegado_disco: true,
    pegado_fondo: true,
    sin_rebabas_pegamento: true,
    sin_ruptura_papel: true,
    medidas_coinciden: true,
    estado_gomas_fondo: 'Buenas condiciones',
    velocidad_trabajo: '180',
    cantidad_revisada: '100',
    
    // Nuevos parámetros
    pegamento_lineal: true,
    defecto_impresion: false,
    medida_ancho: '',
    medida_largo: '',
    medida_fuelle: '',
    medidas_dentro_parametro: true,

    // Solo Con Asa
    pegamiento_suficiente_asa: true,
    pegamiento_suficiente_parche: true,
    posicion_asa_correcta: true,
    temperatura_pegamento: '160',
    pegado_correcto_parche: true,
    aplicacion_hot_melt_correcta: true,
    posicion_parche_correcta: true
  });

  // Estados Defecto
  const [defectData, setDefectData] = useState({
    descripcion_defecto: '',
    accion_correctiva: ''
  });
  
  // Estados para Registro Manual en Caliente de Bobina (Nanjang / Con Asa)
  const [showManualBobinaForm, setShowManualBobinaForm] = useState(false);
  const [manualBobinaData, setManualBobinaData] = useState({
    marca_especificaciones: '',
    ancho_bobina: '',
    gramaje: '',
    fecha_produccion_bobina: new Date().toISOString().split('T')[0],
    porcentaje_humedad: '',
    flexo_fecha_impresion: new Date().toISOString().split('T')[0],
    flexo_maquina: 'M1',
    flexo_operador: ''
  });

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Inicializar hora actual
  useEffect(() => {
    const now = new Date();
    const formattedTime = now.toTimeString().split(' ')[0].substring(0, 5);
    setHora(formattedTime);
  }, []);

  // Actualizar máquina al cambiar área
  useEffect(() => {
    if (area === 'Flexo') setMaquina(MAQUINAS_FLEXO[0]);
    else if (area === 'Nanjang') setMaquina(MAQUINAS_NANJANG[0]);
    else if (area === 'Con Asa') setMaquina(MAQUINAS_ASA[0]);
    else if (area === 'Frías' || area.startsWith('Banda')) setMaquina(MAQUINAS_FRIAS[0]);
  }, [area]);

  // Buscar bobina activa cuando cambia el input de rollo
  useEffect(() => {
    if (!bolsaRolloInput.trim()) {
      setMatchedBobina(null);
      setShowManualBobinaForm(false);
      return;
    }
    const match = bobinas.find(
      (b) => b.numero_rollo.toLowerCase() === bolsaRolloInput.trim().toLowerCase()
    );
    if (match) {
      // Intentar buscar los datos del registro de Flexo localmente o de la bobina
      const localFlexo = inspections?.find(i => i.bobina_id === match.id && i.area === 'Flexo');
      const enrichedMatch = {
        ...match,
        flexo_fecha: match.flexo_fecha || localFlexo?.fecha_registro,
        flexo_maquina: match.flexo_maquina || localFlexo?.flexo_maquina || localFlexo?.maquina,
        flexo_operador: match.flexo_operador || localFlexo?.flexo_operador || localFlexo?.operador
      };
      setMatchedBobina(enrichedMatch);
      setShowManualBobinaForm(false);
    } else {
      setMatchedBobina(null);
      setShowManualBobinaForm(true);
    }
  }, [bolsaRolloInput, bobinas, inspections]);

  // Auto-evaluación del resultado
  useEffect(() => {
    let hasFail = false;
    let autoDefectDesc = '';
    let autoDefectAccion = '';

    if (area === 'Flexo') {
      if (!flexoData.impresion_correcta || !flexoData.registro_correcto || flexoData.estado_fisico_rollo === 'Malas condiciones') {
        hasFail = true;
      }
    } else if (area === 'Nanjang' || (area === 'Con Asa' && role !== 'pruebas_carga')) {
      if (!bolsasData.pegado_disco || !bolsasData.pegado_fondo || !bolsasData.sin_rebabas_pegamento || 
          !bolsasData.sin_ruptura_papel || !bolsasData.medidas_coinciden || bolsasData.estado_gomas_fondo === 'Malas condiciones' ||
          !bolsasData.pegamento_lineal || bolsasData.defecto_impresion || !bolsasData.medidas_dentro_parametro) {
        hasFail = true;
      }
      if (area === 'Con Asa') {
        if (!bolsasData.pegamiento_suficiente_asa || !bolsasData.pegamiento_suficiente_parche || !bolsasData.posicion_asa_correcta ||
            !bolsasData.pegado_correcto_parche || !bolsasData.aplicacion_hot_melt_correcta || !bolsasData.posicion_parche_correcta) {
          hasFail = true;
        }
        const temp = parseFloat(bolsasData.temperatura_pegamento);
        if (isNaN(temp) || temp < 145 || temp > 175) {
          hasFail = true;
        }
      }
    } else if ((area === 'Con Asa' || area.startsWith('Banda') || area === 'Frías') && role === 'pruebas_carga') {
      const { carga_tipo_prueba, carga_hora_inicial, carga_hora_final } = cargaData;
      let duration = 0;
      if (carga_hora_inicial && carga_hora_final) {
        const [h1, m1] = carga_hora_inicial.split(':').map(Number);
        const [h2, m2] = carga_hora_final.split(':').map(Number);
        duration = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (duration < 0) duration += 24 * 60;
      }

      if (carga_tipo_prueba === 'dinamica') {
        if (duration < 15) {
          hasFail = true;
          autoDefectDesc = `Prueba de carga dinámica falló. Duración: ${duration} minutos (requerido >= 15 min).`;
          autoDefectAccion = `Ajustar dosificación de cola hotmelt del asa y calibrar rodillos presores.`;
        }
      } else {
        if (duration < 30) {
          hasFail = true;
          autoDefectDesc = `Prueba de carga estática falló. Duración: ${duration} minutos (requerido >= 30 min).`;
          autoDefectAccion = `Revisar fraguado de cola fría en parches y verificar gramaje del papel kraft del asa.`;
        }
      }
    }

    setResultado(hasFail ? 'Rechazado' : 'Aprobado');
    
    if (hasFail && autoDefectDesc) {
      setDefectData({
        descripcion_defecto: autoDefectDesc,
        accion_correctiva: autoDefectAccion
      });
    } else if (!hasFail) {
      // Solo limpiar si era un autocompletado de prueba de carga
      setDefectData(prev => {
        if (prev.descripcion_defecto.startsWith('Prueba de carga')) {
          return { descripcion_defecto: '', accion_correctiva: '' };
        }
        return prev;
      });
    }
  }, [area, role, flexoData, bolsasData, cargaData]);

  const handleFlexoChange = (name, val) => {
    setFlexoData(prev => ({ ...prev, [name]: val }));
  };

  const handleBolsasChange = (name, val) => {
    setBolsasData(prev => ({ ...prev, [name]: val }));
  };

  const handleBobinaChange = (name, val) => {
    setBobinaFlexoData(prev => ({ ...prev, [name]: val }));
  };

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
              const compressedFile = new File([blob], (file.name || 'evidencia').replace(/\.[^/.]+$/, "") + ".jpg", {
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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const processedFile = await compressImage(file);
      setFotoFile(processedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(processedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!operador) {
      showNotification('Introduce el nombre del operador.', 'danger');
      return;
    }

    setLoading(true);

    try {
      let activeBobinaId = null;

      if (area === 'Flexo') {
        // Validar e ingresar bobina directamente
        const { numero_rollo, marca_especificaciones, ancho_bobina, gramaje, fecha_produccion_bobina, porcentaje_humedad } = bobinaFlexoData;
        if (!numero_rollo || !marca_especificaciones || !ancho_bobina || !gramaje || !fecha_produccion_bobina || !porcentaje_humedad) {
          throw new Error('Todos los campos de la bobina entrante son obligatorios.');
        }

        // Primero verificar si ya existe en la lista local para evitar duplicar
        const existing = bobinas.find(b => b.numero_rollo.toLowerCase() === numero_rollo.trim().toLowerCase());
        if (existing) {
          activeBobinaId = existing.id;
        } else {
          // Registrar nueva bobina
          const bobinaRes = await fetch('/api/bobinas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_rollo: numero_rollo.trim(),
              marca_especificaciones,
              ancho_bobina: parseFloat(ancho_bobina),
              gramaje: parseInt(gramaje, 10),
              fecha_produccion_bobina,
              porcentaje_humedad: parseFloat(porcentaje_humedad)
            })
          });

          if (!bobinaRes.ok) {
            const errData = await bobinaRes.json();
            throw new Error(errData.error || 'Error al registrar la bobina');
          }
          const savedBobina = await bobinaRes.json();
          activeBobinaId = savedBobina.id;
        }
      } else if (area === 'Frías' || area.startsWith('Banda')) {
        // En Frías no se requiere rollo obligatorio, usar marca como identificador
        const marca = friasData.marca_especificaciones.trim() || bolsaRolloInput.trim() || 'Frías Marca Estándar';
        activeBobinaId = 'frias_' + Date.now();
        bolsaRolloInput = marca;
      } else {
        // En Bolsas, validar bobina activa o registrar manualmente si aplica
        if (!matchedBobina) {
          if (showManualBobinaForm) {
            const { 
              marca_especificaciones, 
              ancho_bobina, 
              gramaje, 
              fecha_produccion_bobina, 
              porcentaje_humedad,
              flexo_fecha_impresion,
              flexo_maquina,
              flexo_operador
            } = manualBobinaData;

            if (!marca_especificaciones || !ancho_bobina || !gramaje || !fecha_produccion_bobina || !porcentaje_humedad || !flexo_fecha_impresion || !flexo_operador) {
              throw new Error('Todos los campos del registro manual de bobina son obligatorios.');
            }

            // 1. Registrar la bobina física
            const bobinaRes = await fetch('/api/bobinas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                numero_rollo: bolsaRolloInput.trim(),
                marca_especificaciones,
                ancho_bobina: parseFloat(ancho_bobina),
                gramaje: parseInt(gramaje, 10),
                fecha_produccion_bobina,
                porcentaje_humedad: parseFloat(porcentaje_humedad)
              })
            });

            if (!bobinaRes.ok) {
              const errData = await bobinaRes.json();
              throw new Error(errData.error || 'Error al registrar la bobina manualmente');
            }
            const savedBobina = await bobinaRes.json();
            activeBobinaId = savedBobina.id;

            // 2. Registrar la inspección simulada de Flexo con los datos del impresor
            const flexoSimulatedRes = await fetch('/api/inspecciones', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: JSON.stringify({
                  bobina_id: activeBobinaId,
                  area: 'Flexo',
                  maquina: flexo_maquina,
                  hora_inspeccion: '12:00',
                  operador: flexo_operador,
                  tiene_print_card: 1,
                  resultado: 'Aprobado',
                  observaciones: 'Registro manual en caliente desde bolsas',
                  numero_tintas: 1,
                  impresion_correcta: 1,
                  registro_correcto: 1,
                  estado_fisico_rollo: 'Buenas condiciones',
                  ultimo_lavado_grabado: new Date().toISOString().split('T')[0],
                  fecha_registro: flexo_fecha_impresion + ' 12:00:00'
                })
              })
            });

            if (!flexoSimulatedRes.ok) {
              const errData = await flexoSimulatedRes.json();
              throw new Error(errData.error || 'Error al registrar la inspección simulada de Flexo');
            }
          } else {
            throw new Error('Debes ingresar un número de rollo registrado previamente en Flexo.');
          }
        } else {
          activeBobinaId = matchedBobina.id;
        }
      }

      // Preparar payload de inspección
      const payload = {
        bobina_id: activeBobinaId,
        area,
        maquina,
        hora_inspeccion: hora,
        operador,
        tiene_print_card: tienePrintCard,
        resultado,
        observaciones,
        
        // Datos Flexo
        ...(area === 'Flexo' ? {
          ...flexoData,
          numero_tintas: parseInt(flexoData.numero_tintas, 10)
        } : {}),

        // Datos Bolsas (Nanjang y Con Asa)
        ...(area !== 'Flexo' ? {
          ...bolsasData,
          velocidad_trabajo: parseFloat(bolsasData.velocidad_trabajo) || 0,
          cantidad_revisada: parseInt(bolsasData.cantidad_revisada, 10) || 0,
          temperatura_pegamento: (area === 'Con Asa' && role !== 'pruebas_carga') ? parseFloat(bolsasData.temperatura_pegamento) : null,
          medida_ancho: bolsasData.medida_ancho ? parseFloat(bolsasData.medida_ancho) : null,
          medida_largo: bolsasData.medida_largo ? parseFloat(bolsasData.medida_largo) : null,
          medida_fuelle: bolsasData.medida_fuelle ? parseFloat(bolsasData.medida_fuelle) : null,
          
          // Pruebas de Carga
          es_prueba_carga: (area === 'Con Asa' && role === 'pruebas_carga') ? 1 : 0,
          ...(area === 'Con Asa' && role === 'pruebas_carga' ? {
            carga_tipo_prueba: cargaData.carga_tipo_prueba,
            carga_hora_inicial: cargaData.carga_hora_inicial,
            carga_hora_final: cargaData.carga_hora_final,
            carga_peso_kg: parseFloat(cargaData.carga_peso_kg) || 0,
            carga_realizado_por: cargaData.carga_realizado_por,
            carga_resultado: resultado === 'Aprobado' ? 'Pasa' : 'Falla'
          } : {})
        } : {}),

        // Defectos
        ...(resultado === 'Rechazado' ? defectData : {})
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      if (resultado === 'Rechazado' && fotoFile) {
        formData.append('foto', fotoFile);
      }

      const response = await fetch('/api/inspecciones', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Error al guardar la inspección';
        try {
          const errData = JSON.parse(errText);
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {
          if (errText) {
            const cleanText = errText.replace(/<[^>]*>?/gm, '').trim();
            if (cleanText) errMsg = cleanText.substring(0, 150);
          }
        }
        throw new Error(errMsg);
      }

      showNotification('¡Inspección registrada con éxito!', 'success');
      
      // Resetear campos
      setObservaciones('');
      setFotoFile(null);
      setFotoPreview(null);
      setDefectData({ descripcion_defecto: '', accion_correctiva: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (area === 'Flexo') {
        setBobinaFlexoData({
          numero_rollo: '',
          marca_especificaciones: '',
          ancho_bobina: '80',
          gramaje: '90',
          fecha_produccion_bobina: new Date().toISOString().split('T')[0],
          porcentaje_humedad: '5.0'
        });
      } else {
        setBolsaRolloInput('');
        setManualBobinaData({
          marca_especificaciones: '',
          ancho_bobina: '',
          gramaje: '',
          fecha_produccion_bobina: new Date().toISOString().split('T')[0],
          porcentaje_humedad: '',
          flexo_fecha_impresion: new Date().toISOString().split('T')[0],
          flexo_maquina: 'M1',
          flexo_operador: ''
        });
        setShowManualBobinaForm(false);
        setBolsasData(prev => ({
          ...prev,
          pegado_correcto_parche: true,
          aplicacion_hot_melt_correcta: true,
          posicion_parche_correcta: true,
          medida_ancho: '',
          medida_largo: '',
          medida_fuelle: '',
          medidas_dentro_parametro: true
        }));
      }

      const now = new Date();
      setHora(now.toTimeString().split(' ')[0].substring(0, 5));

      onInspectionSaved();
    } catch (err) {
      showNotification(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title">
        <h2>Nueva Inspección de Calidad</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Completa el formulario de auditoría
        </span>
      </div>

      {/* 1. Metadatos Generales */}
      <div className="form-grid">
        <div className="form-group">
          <label>Área de Producción</label>
          <select 
            className="form-control" 
            value={area} 
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="Flexo">Flexo (Impresión)</option>
            <option value="Nanjang">Nanjang (Sin Asa)</option>
            <option value="Con Asa">Con Asa</option>
          </select>
        </div>

        <div className="form-group">
          <label>Máquina</label>
          <select 
            className="form-control" 
            value={maquina} 
            onChange={(e) => setMaquina(e.target.value)}
          >
            {area === 'Flexo' && MAQUINAS_FLEXO.map(m => <option key={m} value={m}>{m}</option>)}
            {area === 'Nanjang' && MAQUINAS_NANJANG.map(m => <option key={m} value={m}>{m}</option>)}
            {area === 'Con Asa' && MAQUINAS_ASA.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Hora de Inspección</label>
          <input 
            type="time" 
            className="form-control" 
            value={hora} 
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Operador de la Máquina</label>
          <input 
            type="text" 
            className="form-control" 
            value={operador} 
            onChange={(e) => setOperador(e.target.value)}
            placeholder="Nombre operador"
            required
          />
        </div>

        <div className="form-group">
          <label>Print Card en Máquina</label>
          <div className="toggle-group">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tienePrintCard ? 'Disponible' : 'No Disponible'}</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={tienePrintCard} 
                onChange={(e) => setTienePrintCard(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      {/* 2. Sección Dinámica de Bobina */}
      <div id="bobina-dynamic-section">
        {area === 'Flexo' ? (
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>📝 Datos de Bobina Entrante</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Número de Rollo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={bobinaFlexoData.numero_rollo}
                  onChange={(e) => handleBobinaChange('numero_rollo', e.target.value)}
                  placeholder="Ej. B-9040"
                  required
                />
              </div>
              <div className="form-group">
                <label>Especificaciones / Marca</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={bobinaFlexoData.marca_especificaciones}
                  onChange={(e) => handleBobinaChange('marca_especificaciones', e.target.value)}
                  placeholder="Ej. Starbucks Kraft M"
                  required
                />
              </div>
              <div className="form-group">
                <label>Ancho de Bobina (cm)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={bobinaFlexoData.ancho_bobina}
                  onChange={(e) => handleBobinaChange('ancho_bobina', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gramaje (g/m²)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={bobinaFlexoData.gramaje}
                  onChange={(e) => handleBobinaChange('gramaje', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha Producción Bobina</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={bobinaFlexoData.fecha_produccion_bobina}
                  onChange={(e) => handleBobinaChange('fecha_produccion_bobina', e.target.value)}
                  required
                />
              </div>
              <div class="form-group">
                <label>% Humedad Indicado</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="form-control" 
                  value={bobinaFlexoData.porcentaje_humedad}
                  onChange={(e) => handleBobinaChange('porcentaje_humedad', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>🔍 Datos de Bobina Activa</h3>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="form-group">
                <label>Escribir Número de Rollo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={bolsaRolloInput}
                  onChange={(e) => setBolsaRolloInput(e.target.value)}
                  placeholder="Escribe el rollo (Ej. B-8090)..."
                  list="react-bobinas-datalist"
                  required
                />
                <datalist id="react-bobinas-datalist">
                  {bobinas.map(b => <option key={b.id} value={b.numero_rollo} />)}
                </datalist>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                {matchedBobina ? (
                  <div style={{ padding: '12px', border: '1px solid var(--color-success)', background: 'var(--color-success-bg)', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>
                        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>✅ Bobina encontrada:</span>
                        <span style={{ marginLeft: '5px' }}><strong>{matchedBobina.marca_especificaciones}</strong> (Ancho: {matchedBobina.ancho_bobina}cm | Gramaje: {matchedBobina.gramaje}g | Humedad: {matchedBobina.porcentaje_humedad}%)</span>
                      </div>
                      {matchedBobina.flexo_fecha ? (
                        <div style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
                          📅 Reg: {matchedBobina.flexo_fecha.split(' ')[0]} &bull; 🖥️ Máq: {matchedBobina.flexo_maquina} &bull; 👤 Op: {matchedBobina.flexo_operador}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          📅 Reg: {matchedBobina.fecha_produccion_bobina} &bull; (Sin auditoría previa de Flexo)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', border: '1px solid var(--border-color)', background: '#fafafa', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: bolsaRolloInput.trim() ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: bolsaRolloInput.trim() ? '600' : 'normal' }}>
                      {bolsaRolloInput.trim() ? '❌ Rollo no registrado: No se encontró registro en Flexo. Debe registrarlo primero en Flexo.' : 'Escribe el número de rollo para buscar sus especificaciones técnicas de Flexo.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {showManualBobinaForm && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid var(--color-primary-light)', background: 'rgba(79, 70, 229, 0.02)', borderRadius: 'var(--border-radius-md)' }}>
                <span style={{ fontWeight: '700', color: 'var(--color-primary-light)', display: 'block', marginBottom: '1rem' }}>
                  ⚠️ Rollo no registrado en Flexo. Ingresa los datos manualmente:
                </span>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Especificaciones / Marca</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualBobinaData.marca_especificaciones}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, marca_especificaciones: e.target.value }))}
                      placeholder="Ej. Starbucks Kraft M"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Ancho de Bobina (cm)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualBobinaData.ancho_bobina}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, ancho_bobina: e.target.value }))}
                      placeholder="Ej. 80"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Gramaje (g/m²)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualBobinaData.gramaje}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, gramaje: e.target.value }))}
                      placeholder="Ej. 90"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>% Humedad Indicado</label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="form-control" 
                      value={manualBobinaData.porcentaje_humedad}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, porcentaje_humedad: e.target.value }))}
                      placeholder="Ej. 5.5"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha Producción Bobina</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={manualBobinaData.fecha_produccion_bobina}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, fecha_produccion_bobina: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Impresión (Flexo)</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={manualBobinaData.flexo_fecha_impresion}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, flexo_fecha_impresion: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Máquina de Impresión (Flexo)</label>
                    <select 
                      className="form-control" 
                      value={manualBobinaData.flexo_maquina}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, flexo_maquina: e.target.value }))}
                      required
                    >
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                      <option value="M3">M3</option>
                      <option value="M4">M4</option>
                      <option value="M5">M5</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Impresor (Operador de Flexo)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualBobinaData.flexo_operador}
                      onChange={(e) => setManualBobinaData(prev => ({ ...prev, flexo_operador: e.target.value }))}
                      placeholder="Nombre del impresor"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      {/* 3. Parámetros Específicos del Área */}
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem', color: 'var(--color-primary)' }}>
        Controles de Calidad - {area}
      </h3>

      {(area.startsWith('Banda') || area === 'Frías') && (
        <div style={{ marginBottom: '1.5rem', padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', background: '#fafafa' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--color-primary)' }}>🏷️ Datos de la Bolsa (Frías)</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Marca / Especificación</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Ej. Starbucks Kraft M"
                value={friasData.marca_especificaciones}
                onChange={(e) => setFriasData(prev => ({ ...prev, marca_especificaciones: e.target.value }))}
              />
            </div>
            {role !== 'pruebas_carga' && (
              <div className="form-group">
                <label>¿La bolsa viene en buenas condiciones generales?</label>
                <select 
                  className="form-control"
                  value={friasData.bolsa_buenas_condiciones ? 'Si' : 'No'}
                  onChange={(e) => setFriasData(prev => ({ ...prev, bolsa_buenas_condiciones: e.target.value === 'Si' }))}
                >
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )

      {area === 'Flexo' && (
        <div className="form-grid">
          <div className="form-group">
            <label>Número de Tintas</label>
            <input 
              type="number" 
              className="form-control" 
              value={flexoData.numero_tintas} 
              onChange={(e) => handleFlexoChange('numero_tintas', e.target.value)}
              min="1" max="10"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Impresión Correcta</label>
            <div className="toggle-group">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{flexoData.impresion_correcta ? 'OK' : 'Fallo'}</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={flexoData.impresion_correcta} 
                  onChange={(e) => handleFlexoChange('impresion_correcta', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Registro de Colores</label>
            <div className="toggle-group">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{flexoData.registro_correcto ? 'OK' : 'Fallo'}</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={flexoData.registro_correcto} 
                  onChange={(e) => handleFlexoChange('registro_correcto', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Estado Físico Rollo</label>
            <select 
              className="form-control"
              value={flexoData.estado_fisico_rollo}
              onChange={(e) => handleFlexoChange('estado_fisico_rollo', e.target.value)}
            >
              <option value="Buenas condiciones">Buenas condiciones</option>
              <option value="Malas condiciones">Malas condiciones</option>
            </select>
          </div>

          <div className="form-group">
            <label>Último Lavado Grabado</label>
            <input 
              type="date" 
              className="form-control" 
              value={flexoData.ultimo_lavado_grabado}
              onChange={(e) => handleFlexoChange('ultimo_lavado_grabado', e.target.value)}
              required
            />
          </div>
        </div>
      )}

      {/* Controles Visuales para Nanjang o Con Asa (cuando el rol no sea pruebas_carga) */}
      {(area === 'Nanjang' || (area === 'Con Asa' && role !== 'pruebas_carga')) && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>Pegado del Disco</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegado_disco ? 'OK' : 'Fallo'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.pegado_disco} 
                    onChange={(e) => handleBolsasChange('pegado_disco', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Pegado del Fondo</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegado_fondo ? 'OK' : 'Fallo'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.pegado_fondo} 
                    onChange={(e) => handleBolsasChange('pegado_fondo', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Sin Rebabas de Pegamento</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.sin_rebabas_pegamento ? 'OK' : 'Con Rebabas'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.sin_rebabas_pegamento} 
                    onChange={(e) => handleBolsasChange('sin_rebabas_pegamento', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Integridad del Papel (Rupturas)</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.sin_ruptura_papel ? 'Sin ruptura' : 'Con ruptura'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.sin_ruptura_papel} 
                    onChange={(e) => handleBolsasChange('sin_ruptura_papel', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Medidas Coinciden (Marca)</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.medidas_coinciden ? 'Sí' : 'No'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.medidas_coinciden} 
                    onChange={(e) => handleBolsasChange('medidas_coinciden', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Estado Gomas de Fondo</label>
              <select 
                className="form-control"
                value={bolsasData.estado_gomas_fondo}
                onChange={(e) => handleBolsasChange('estado_gomas_fondo', e.target.value)}
              >
                <option value="Buenas condiciones">Buenas condiciones</option>
                <option value="Malas condiciones">Malas condiciones</option>
              </select>
            </div>

            <div className="form-group">
              <label>Velocidad Trabajo (bolsas/min)</label>
              <input 
                type="number" 
                className="form-control" 
                value={bolsasData.velocidad_trabajo} 
                onChange={(e) => handleBolsasChange('velocidad_trabajo', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Bolsas Revisadas (Cantidad)</label>
              <input 
                type="number" 
                className="form-control" 
                value={bolsasData.cantidad_revisada} 
                onChange={(e) => handleBolsasChange('cantidad_revisada', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Pegamiento Lineal</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegamento_lineal ? 'Correcto' : 'Fallo'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.pegamento_lineal} 
                    onChange={(e) => handleBolsasChange('pegamento_lineal', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Defectos de Impresión</label>
              <div className="toggle-group">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.defecto_impresion ? 'Presente ❌' : 'Sin Defectos'}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={bolsasData.defecto_impresion} 
                    onChange={(e) => handleBolsasChange('defecto_impresion', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label style={{ fontWeight: '700', color: 'var(--color-primary-light)' }}>Medidas Reales de la Bolsa (Físicas en Pulgadas)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ancho (pulgadas)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    placeholder="Ancho pulg"
                    value={bolsasData.medida_ancho} 
                    onChange={(e) => handleBolsasChange('medida_ancho', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Largo/Alto (pulgadas)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    placeholder="Largo pulg"
                    value={bolsasData.medida_largo} 
                    onChange={(e) => handleBolsasChange('medida_largo', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fuelle/Lateral (pulgadas)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    placeholder="Fuelle pulg"
                    value={bolsasData.medida_fuelle} 
                    onChange={(e) => handleBolsasChange('medida_fuelle', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>¿Dentro del parámetro?</label>
                  <div className="toggle-group" style={{ height: '38px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.medidas_dentro_parametro ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.medidas_dentro_parametro} 
                        onChange={(e) => handleBolsasChange('medidas_dentro_parametro', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adicionales solo para "Con Asa" */}
          {(area === 'Con Asa' || area.startsWith('Banda') || area === 'Frías') && (
            <div style={{ marginTop: '1.5rem', padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', background: '#fbfbfb' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--color-primary)' }}>Parámetros Adicionales de Asa</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Pegamento Suficiente Asa</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegamiento_suficiente_asa ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.pegamiento_suficiente_asa} 
                        onChange={(e) => handleBolsasChange('pegamiento_suficiente_asa', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Pegamento Suficiente Parche</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegamiento_suficiente_parche ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.pegamiento_suficiente_parche} 
                        onChange={(e) => handleBolsasChange('pegamiento_suficiente_parche', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Posición del Asa</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.posicion_asa_correcta ? 'Correcta' : 'Incorrecta'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.posicion_asa_correcta} 
                        onChange={(e) => handleBolsasChange('posicion_asa_correcta', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Pegado Correcto Parche</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.pegado_correcto_parche ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.pegado_correcto_parche} 
                        onChange={(e) => handleBolsasChange('pegado_correcto_parche', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Correcta Aplicación Hot Melt</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.aplicacion_hot_melt_correcta ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.aplicacion_hot_melt_correcta} 
                        onChange={(e) => handleBolsasChange('aplicacion_hot_melt_correcta', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Posición Parche Correcta</label>
                  <div className="toggle-group">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bolsasData.posicion_parche_correcta ? 'Sí' : 'No'}</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={bolsasData.posicion_parche_correcta} 
                        onChange={(e) => handleBolsasChange('posicion_parche_correcta', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Temperatura Pegamento Hotmelt (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={bolsasData.temperatura_pegamento} 
                    onChange={(e) => handleBolsasChange('temperatura_pegamento', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Controles de Prueba de Carga para Con Asa */}
      {area === 'Con Asa' && role === 'pruebas_carga' && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem', color: 'var(--color-primary)' }}>Parámetros de Prueba de Carga</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo de Prueba</label>
              <select 
                className="form-control"
                value={cargaData.carga_tipo_prueba}
                onChange={(e) => setCargaData(prev => ({ ...prev, carga_tipo_prueba: e.target.value }))}
              >
                <option value="estatica">Estática (mínimo 30 min)</option>
                <option value="dinamica">Dinámica (mínimo 15 min)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Hora Inicial</label>
              <input 
                type="time" 
                className="form-control"
                value={cargaData.carga_hora_inicial}
                onChange={(e) => setCargaData(prev => ({ ...prev, carga_hora_inicial: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label>Hora Final</label>
              <input 
                type="time" 
                className="form-control"
                value={cargaData.carga_hora_final}
                onChange={(e) => setCargaData(prev => ({ ...prev, carga_hora_final: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Peso Colocado (kg)</label>
              <input 
                type="number" 
                className="form-control"
                value={cargaData.carga_peso_kg}
                onChange={(e) => setCargaData(prev => ({ ...prev, carga_peso_kg: e.target.value }))}
                min="1" step="0.5"
              />
            </div>

            <div className="form-group">
              <label>Realizado por</label>
              <select 
                className="form-control"
                value={cargaData.carga_realizado_por}
                onChange={(e) => setCargaData(prev => ({ ...prev, carga_realizado_por: e.target.value }))}
              >
                <option value="inspector">Inspector</option>
                <option value="operadores">Operadores</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duración Calculada</label>
              <div style={{ padding: '10px', border: '1px solid var(--border-color)', background: '#fafafa', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', height: '40px' }}>
                {(() => {
                  const { carga_hora_inicial, carga_hora_final } = cargaData;
                  if (!carga_hora_inicial || !carga_hora_final) return '0 minutos';
                  const [h1, m1] = carga_hora_inicial.split(':').map(Number);
                  const [h2, m2] = carga_hora_final.split(':').map(Number);
                  let duration = (h2 * 60 + m2) - (h1 * 60 + m1);
                  if (duration < 0) duration += 24 * 60;
                  return `${duration} minutos`;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <hr style={{ border: 'none', height: '1px', background: 'var(--border-color)', margin: '2rem 0' }} />

      {/* 4. Resultado e Indicadores de Defecto */}
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="form-group">
          <label>Resultado de Inspección</label>
          <div className="result-selector">
            <div 
              className={`result-card aprobado ${resultado === 'Aprobado' ? 'active' : ''}`}
              onClick={() => setResultado('Aprobado')}
            >
              Aprobado ✅
            </div>
            <div 
              className={`result-card rechazado ${resultado === 'Rechazado' ? 'active' : ''}`}
              onClick={() => setResultado('Rechazado')}
            >
              Rechazado ❌
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Observaciones Generales</label>
          <textarea 
            rows="3" 
            className="form-control"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Anotar detalles adicionales relevantes sobre el lote o estado de la máquina..."
          />
        </div>
      </div>

      {/* 5. Panel de No Conformidad */}
      {resultado === 'Rechazado' && (
        <div className="defect-panel">
          <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', marginBottom: '1rem' }}>
            ⚠️ Reportar Defecto y Acción Correctiva
          </h3>
          
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Descripción Detallada del Defecto</label>
                <textarea 
                  rows="3" 
                  className="form-control"
                  value={defectData.descripcion_defecto}
                  onChange={(e) => setDefectData(prev => ({ ...prev, descripcion_defecto: e.target.value }))}
                  placeholder="Especifica el defecto detectado (ej. Desprendimiento del asa izquierda, corrimiento de tinta, etc.)"
                  required
                />
              </div>
              <div className="form-group">
                <label>Acción Correctiva Implementada</label>
                <textarea 
                  rows="3" 
                  className="form-control"
                  value={defectData.accion_correctiva}
                  onChange={(e) => setDefectData(prev => ({ ...prev, accion_correctiva: e.target.value }))}
                  placeholder="Acción correctiva (ej. Paro de máquina por calibración, ajuste de dosificación, retiro de producto defectuoso)"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Evidencia Fotográfica (Tomar foto o cargar)</label>
              <div className="photo-uploader" onClick={() => fileInputRef.current?.click()}>
                {fotoPreview ? (
                  <>
                    <img src={fotoPreview} alt="Defecto" className="photo-preview" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', marginTop: '8px' }}>Cambiar Foto</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '2rem' }}>📷</span>
                    <span style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Haga clic para capturar o subir</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones Finales */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }} disabled={loading}>
          {loading ? 'Procesando e Guardando...' : '💾 Registrar Inspección'}
        </button>
      </div>
    </form>
  );
}
