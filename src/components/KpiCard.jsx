import React from 'react';

export default function KpiCard({ title, value, unit, icon: Icon, accentColor, badge, badgeType }) {
  return (
    <div className="kpi-card" style={{ '--accent-color': accentColor || 'var(--color-blue)' }}>
      <div className="kpi-header">
        <span className="kpi-label">{title}</span>
        {Icon && <Icon size={18} className="kpi-icon" />}
      </div>

      <div className="kpi-value-group">
        <div className="kpi-value">{value}</div>
        {unit && <div className="kpi-unit">{unit}</div>}
      </div>

      {badge && (
        <div style={{ marginTop: '8px' }}>
          <span className={`kpi-badge ${badgeType || 'info'}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}
