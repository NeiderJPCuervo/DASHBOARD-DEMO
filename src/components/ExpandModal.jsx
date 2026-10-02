import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { X, AlertCircle, Calendar, Search, ZoomIn } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const timeStr = dataPoint.timestamp || dataPoint.date;
    const formattedDate = timeStr ? new Date(timeStr).toLocaleString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    const val = payload[0].value;

    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-time">{formattedDate}</div>
        <div className="tooltip-val" style={{ color: payload[0].color, fontSize: '1.05rem' }}>
          {val !== null ? `${val} ${unit}` : 'N/A'}
        </div>
      </div>
    );
  }
  return null;
};

export default function ExpandModal({ chartConfig, data, rawReadings = [], selectedPeriod, onClose }) {
  // Drag-to-zoom state
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomedRange, setZoomedRange] = useState(null);

  // Calendar day selector state
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute active dataset to display in modal
  const activeData = useMemo(() => {
    if (selectedDate) {
      const dayRaw = rawReadings.filter(r => r.date === selectedDate);
      if (dayRaw.length > 0) return dayRaw;
    }

    if (zoomedRange && rawReadings && rawReadings.length > 0) {
      const { startMs, endMs } = zoomedRange;
      const filteredRaw = rawReadings.filter(r => {
        const t = new Date(r.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
      if (filteredRaw.length > 0) return filteredRaw;
    }

    return data;
  }, [selectedDate, zoomedRange, data, rawReadings]);

  if (!chartConfig) return null;

  const { title, dataKey, unit, color, threshold, thresholdLabel } = chartConfig;

  // Calculate statistics for currently active dataset
  const validVals = activeData ? activeData.map(d => d[dataKey]).filter(v => v !== null && v !== undefined) : [];
  let min = 'N/A', max = 'N/A', avg = 'N/A', alarmsCount = 0;

  if (validVals.length > 0) {
    min = Math.min(...validVals).toFixed(2);
    max = Math.max(...validVals).toFixed(2);
    const sum = validVals.reduce((a, b) => a + b, 0);
    avg = (sum / validVals.length).toFixed(2);

    if (threshold !== null) {
      alarmsCount = validVals.filter(v => v > threshold).length;
    }
  }

  const isZoomed = selectedDate !== '' || zoomedRange !== null;

  // Drag selection event handlers
  const handleMouseDown = (e) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
      setRefAreaRight(e.activeLabel);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const t1 = new Date(refAreaLeft).getTime();
      const t2 = new Date(refAreaRight).getTime();
      if (!isNaN(t1) && !isNaN(t2)) {
        const startMs = Math.min(t1, t2);
        const endMs = Math.max(t1, t2);
        setZoomedRange({ startMs, endMs });
        setSelectedDate('');
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setSelectedDate('');
    setZoomedRange(null);
    setShowDatePicker(false);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    setZoomedRange(null);
    setShowDatePicker(false);
  };

  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const d = new Date(tickItem);
    if (isNaN(d.getTime())) return tickItem;
    if (isZoomed) {
      return d.toLocaleTimeString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2>{title} — Vista Ampliada</h2>
            {isZoomed && (
              <span className="zoom-active-badge">
                <ZoomIn size={14} /> Detalle Punto a Punto (~10min)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* "Ver todo" Reset Button */}
            {isZoomed && (
              <button className="view-all-btn" onClick={handleResetZoom}>
                <Search size={13} />
                <span>Ver todo</span>
              </button>
            )}

            {/* Calendar Day Picker Button */}
            <div style={{ position: 'relative' }}>
              <button
                className={`calendar-picker-btn ${selectedDate ? 'active' : ''}`}
                onClick={() => setShowDatePicker(!showDatePicker)}
                title="Seleccionar un día específico por calendario"
              >
                <Calendar size={14} />
                <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>
                  {selectedDate ? selectedDate : 'Elegir día'}
                </span>
              </button>

              {showDatePicker && (
                <div className="calendar-popover">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Selecciona una fecha:
                  </div>
                  <input
                    type="date"
                    className="calendar-date-input"
                    min="2026-05-01"
                    max="2026-08-31"
                    value={selectedDate}
                    onChange={handleDateChange}
                  />
                </div>
              )}
            </div>

            <button className="modal-close-btn" onClick={onClose} title="Cerrar (Esc)">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="modal-stats-row">
          <div className="modal-stat-item">
            <span className="modal-stat-label">Promedio</span>
            <span className="modal-stat-val" style={{ color }}>{avg} {unit}</span>
          </div>
          <div className="modal-stat-item">
            <span className="modal-stat-label">Mínimo</span>
            <span className="modal-stat-val">{min} {unit}</span>
          </div>
          <div className="modal-stat-item">
            <span className="modal-stat-label">Máximo</span>
            <span className="modal-stat-val">{max} {unit}</span>
          </div>
          <div className="modal-stat-item">
            <span className="modal-stat-label">Puntos Muestreados</span>
            <span className="modal-stat-val">{validVals.length}</span>
          </div>
          {threshold !== null && (
            <div className="modal-stat-item">
              <span className="modal-stat-label">Alarmas (&gt;{threshold}{unit})</span>
              <span className="modal-stat-val" style={{ color: alarmsCount > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                {alarmsCount} {alarmsCount > 0 && <AlertCircle size={14} style={{ display: 'inline', marginLeft: 4 }} />}
              </span>
            </div>
          )}
        </div>

        <div className="modal-chart-body" style={{ touchAction: 'none' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activeData}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <CartesianGrid stroke="#2b303c" strokeDasharray="3 3" />
              <XAxis
                dataKey={activeData[0]?.timestamp ? 'timestamp' : 'date'}
                tickFormatter={formatXAxis}
                stroke="#9ca3af"
                fontSize={11}
                minTickGap={30}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              
              {threshold !== null && (
                <ReferenceLine
                  y={threshold}
                  stroke="#e5484d"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  label={{
                    value: thresholdLabel || `LÍMITE DE ALARMA > ${threshold} ${unit}`,
                    fill: '#e5484d',
                    fontSize: 12,
                    fontWeight: 700,
                    position: 'insideTopRight'
                  }}
                />
              )}

              {/* Shaded highlight rectangle while dragging */}
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.4}
                  fill="#38bdf8"
                  fillOpacity={0.3}
                />
              )}

              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={isZoomed ? 1.8 : 2.2}
                dot={isZoomed ? { r: 2 } : false}
                activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
