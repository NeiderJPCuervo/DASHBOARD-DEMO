import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const MONTH_RANGES = {
  'Mayo': { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.000Z' },
  'Junio': { start: '2026-06-01T00:00:00.000Z', end: '2026-06-30T23:59:59.000Z' },
  'Julio': { start: '2026-07-01T00:00:00.000Z', end: '2026-07-31T23:59:59.000Z' },
  'Agosto': { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T23:59:59.000Z' },
  'Todo': { start: '2026-05-01T00:00:00.000Z', end: '2026-08-31T23:59:59.000Z' }
};

export default function DowntimeTimeline({ downtimeList, selectedPeriod, kpiData }) {
  const [hoveredParo, setHoveredParo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const range = MONTH_RANGES[selectedPeriod] || MONTH_RANGES['Todo'];
  const pStartMs = new Date(range.start).getTime();
  const pEndMs = new Date(range.end).getTime();
  const totalMs = pEndMs - pStartMs;

  // Filter downtime events that overlap with selected period
  const periodDowntimes = downtimeList.filter(d => {
    const dStart = new Date(d.start).getTime();
    const dEnd = new Date(d.end).getTime();
    return dEnd >= pStartMs && dStart <= pEndMs;
  });

  const handleMouseEnter = (e, paro) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredParo(paro);
  };

  const handleMouseLeave = () => {
    setHoveredParo(null);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const totalDowntimeMin = periodDowntimes.reduce((sum, d) => sum + d.durationMinutes, 0);

  return (
    <div className="section-panel" style={{ position: 'relative' }}>
      <div className="section-title-bar">
        <div className="section-title">
          <Clock size={18} />
          <span>Timeline de Estado Operacional & Paros Detectados</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Periodo: <strong style={{ color: 'var(--text-main)' }}>{selectedPeriod === 'Todo' ? 'Mayo - Agosto' : selectedPeriod}</strong>
        </div>
      </div>

      <div className="timeline-track-container">
        <div className="timeline-track">
          {/* Base green track for active state */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--color-green)' }} />

          {/* Red downtime segments */}
          {periodDowntimes.map((paro, idx) => {
            const dStartMs = new Date(paro.start).getTime();
            const dEndMs = new Date(paro.end).getTime();

            const leftPct = Math.max(0, ((dStartMs - pStartMs) / totalMs) * 100);
            const rawWidthPct = ((dEndMs - dStartMs) / totalMs) * 100;
            const widthPct = Math.max(0.2, rawWidthPct); // Minimum width for visibility

            return (
              <div
                key={paro.id || idx}
                className="timeline-segment off"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  zIndex: 2
                }}
                onMouseEnter={(e) => handleMouseEnter(e, paro)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </div>
      </div>

      <div className="timeline-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot on"></span>
            <span>Operando (ON)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot off"></span>
            <span>Detenido (OFF)</span>
          </div>
        </div>
        <div>
          Total Paros: <strong style={{ color: 'var(--color-red)' }}>{periodDowntimes.length}</strong> | Tiempo detenido: <strong style={{ color: 'var(--color-amber)' }}>{(totalDowntimeMin / 60).toFixed(1)} hrs</strong> ({totalDowntimeMin.toFixed(0)} min)
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredParo && (
        <div
          style={{
            position: 'fixed',
            top: `${tooltipPos.y}px`,
            left: `${tooltipPos.x}px`,
            transform: 'translate(-50%, -100%)',
            background: '#1c1f26',
            border: '1px solid var(--color-red)',
            borderRadius: '6px',
            padding: '10px 14px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.8)',
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '220px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-red)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px' }}>
            <AlertTriangle size={15} />
            <span>Paro de Planta Registrado</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'grid', gap: '4px' }}>
            <div><strong>Inicio:</strong> {formatDate(hoveredParo.start)}</div>
            <div><strong>Fin:</strong> {formatDate(hoveredParo.end)}</div>
            <div>
              <strong>Duración:</strong> <span style={{ color: 'var(--color-amber)', fontWeight: '700' }}>{hoveredParo.durationMinutes} min</span> ({ (hoveredParo.durationMinutes / 60).toFixed(1) } hrs)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
