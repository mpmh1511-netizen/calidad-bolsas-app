import React, { useState } from 'react';

export default function BobinaForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    numero_rollo: '',
    marca_especificaciones: '',
    ancho_bobina: '',
    gramaje: '',
    fecha_produccion_bobina: new Date().toISOString().split('T')[0],
    porcentaje_humedad: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones básicas
    if (!formData.numero_rollo || !formData.marca_especificaciones || !formData.ancho_bobina || !formData.gramaje || !formData.fecha_produccion_bobina || !formData.porcentaje_humedad) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/bobinas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          ancho_bobina: parseFloat(formData.ancho_bobina),
          gramaje: parseInt(formData.gramaje, 10),
          porcentaje_humedad: parseFloat(formData.porcentaje_humedad),
          estado_bobina: 'Sin Imprimir'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al guardar la bobina');
      }

      const newBobina = await response.json();
      onSuccess(newBobina);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          <h3>Registrar Nueva Bobina de Papel</h3>
          <button className="toggle-btn" onClick={onClose} style={{ padding: '4px 8px', fontSize: '1.2rem' }}>&times;</button>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Número de Rollo / Bobina</label>
              <input
                type="text"
                name="numero_rollo"
                value={formData.numero_rollo}
                onChange={handleChange}
                placeholder="Ej. B-9045"
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Especificaciones / Marca</label>
              <input
                type="text"
                name="marca_especificaciones"
                value={formData.marca_especificaciones}
                onChange={handleChange}
                placeholder="Ej. Starbucks Kraft L"
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Ancho de Bobina (cm)</label>
              <input
                type="number"
                step="0.1"
                name="ancho_bobina"
                value={formData.ancho_bobina}
                onChange={handleChange}
                placeholder="Ej. 85.5"
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Gramaje (g/m²)</label>
              <input
                type="number"
                name="gramaje"
                value={formData.gramaje}
                onChange={handleChange}
                placeholder="Ej. 90"
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha Producción Bobina</label>
              <input
                type="date"
                name="fecha_produccion_bobina"
                value={formData.fecha_produccion_bobina}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>% Humedad Indicado</label>
              <input
                type="number"
                step="0.1"
                name="porcentaje_humedad"
                value={formData.porcentaje_humedad}
                onChange={handleChange}
                placeholder="Ej. 5.5"
                className="form-control"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Bobina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
