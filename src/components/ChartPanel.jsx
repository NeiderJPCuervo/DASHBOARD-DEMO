import React, { useState, useMemo } from 'react';
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
import { Maximize2, Calendar, Search, X } from 'lucide-react';

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
        <div className="tooltip-val" style={{ color: payload[0].color }}>
          {val !== null ? `${val} ${unit}` : 'N/A'}
        </div>
      </div>
    );
  }
  return null;
};

export default function ChartPanel({
  title,
  dataKey,
  unit,
  data,
  rawReadings = [],
  color = '#38bdf8',
  threshold = null,
  thresholdLabel = '',
  onExpand
}) {
  // Drag-to-zoom state
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomedRange, setZoomedRange] = useState(null);

  // Calendar day selector state
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // First-time user tip state (persisted in localStorage)
  const [showTip, setShowTip] = useState(() => {
    return !localStorage.getItem('hasSeenZoomTip');
  });

  const handleDismissTip = (e) => {
    if (e) e.stopPropagation();
    localStorage.setItem('hasSeenZoomTip', 'true');
    setShowTip(false);
  };

  // Compute active dataset based on zoom or date filter
  const activeData = useMemo(() => {
    if (selectedDate) {
      const filtered = rawReadings.filter(r => r.date === selectedDate);
      if (filtered.length > 0) return filtered;
    }

    if (zoomedRange && rawReadings && rawReadings.length > 0) {
      const { startMs, endMs } = zoomedRange;
      const filtered = rawReadings.filter(r => {
        const t = new Date(r.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
      if (filtered.length > 0) return filtered;
    }

    return data;
  }, [selectedDate, zoomedRange, data, rawReadings]);

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

        if (showTip) {
          handleDismissTip();
        }
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoomedRange(null);
    setSelectedDate('');
    setShowDatePicker(false);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    setZoomedRange(null);
    setShowDatePicker(false);
    if (showTip) handleDismissTip();
  };

  // Format X-axis tick
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const d = new Date(tickItem);
    if (isNaN(d.getTime())) return tickItem;
    if (isZoomed) {
      return d.toLocaleTimeString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  // Compute current/avg value for header display
  const validVals = activeData ? activeData.map(d => d[dataKey]).filter(v => v !== null && v !== undefined) : [];
  const latestVal = validVals.length > 0 ? validVals[validVals.length - 1] : 'N/A';

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="chart-title">{title}</span>
            <span className="chart-current-val" style={{ color }}>
              {latestVal !== 'N/A' ? `${latestVal} ${unit}` : 'N/A'}
            </span>
          </div>

          {showTip && !isZoomed && (
            <div className="zoom-hint-tip">
              <span>💡 Tip: arrastra sobre la gráfica para ver el detalle</span>
              <button className="dismiss-tip-btn" onClick={handleDismissTip} title="Cerrar tip">
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* "Ver todo" Reset Button */}
          {isZoomed && (
            <button
              className="view-all-btn"
              onClick={handleResetZoom}
              title="Restablecer vista original"
            >
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
            </button>

            {showDatePicker && (
              <div className="calendar-popover">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Elige un día (Mayo - Agosto):
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

          {/* Expand Modal Button */}
          <button
            className="expand-btn"
            title="Expandir a pantalla completa"
            onClick={() => onExpand({ title, dataKey, unit, color, threshold, thresholdLabel })}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="chart-container-inner" style={{ touchAction: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={activeData}
            margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <CartesianGrid stroke="#2b303c" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={activeData[0]?.timestamp ? 'timestamp' : 'date'}
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            
            {threshold !== null && (
              <ReferenceLine
                y={threshold}
                stroke="#e5484d"
                strokeDasharray="4 4"
                label={{
                  value: thresholdLabel || `Alarma >${threshold}`,
                  fill: '#e5484d',
                  fontSize: 10,
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
              strokeWidth={isZoomed ? 1.5 : 1.8}
              dot={isZoomed ? { r: 1.5 } : false}
              activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
