import React from 'react';
import { Activity, Calendar } from 'lucide-react';

const PERIODS = [
  { key: 'Mayo', label: 'Mayo' },
  { key: 'Junio', label: 'Junio' },
  { key: 'Julio', label: 'Julio' },
  { key: 'Agosto', label: 'Agosto' },
  { key: 'Todo', label: 'Todo el período' }
];

export default function Header({ selectedPeriod, onSelectPeriod }) {
  return (
    <header className="top-header">
      <div className="header-brand">
        <div className="header-icon">
          <Activity size={22} />
        </div>
        <div className="header-title-group">
          <h1>Planta Hidratadora — Histórico Mayo-Agosto</h1>
          <p>Monitoreo Operacional de Parámetros Críticos y Registro de Paros</p>
        </div>
      </div>

      <div className="period-selector">
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: 'var(--text-muted)' }}>
          <Calendar size={15} style={{ marginRight: '4px' }} />
        </span>
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-btn ${selectedPeriod === p.key ? 'active' : ''}`}
            onClick={() => onSelectPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </header>
  );
}
