import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import KpiCard from './components/KpiCard';
import DowntimeTimeline from './components/DowntimeTimeline';
import ChartPanel from './components/ChartPanel';
import ExpandModal from './components/ExpandModal';

import readingsHourly from './data/readings_hourly.json';
import readingsDaily from './data/readings_daily.json';
import readingsRaw from './data/readings_raw.json';
import downtimeData from './data/downtime.json';
import kpisData from './data/kpis_by_month.json';

import {
  Zap,
  Droplets,
  CheckCircle2,
  AlertOctagon,
  Thermometer,
  Activity,
  Flame,
  Gauge,
  Wind,
  Sliders,
  Cpu,
  Layers
} from 'lucide-react';

const TABS = [
  { id: 'etapa1', label: 'Etapa 1', icon: Flame, count: 5 },
  { id: 'etapa2', label: 'Etapa 2', icon: Gauge, count: 4 },
  { id: 'alimentacion', label: 'Alimentación', icon: Zap, count: 6 },
  { id: 'filtro', label: 'Filtro y Gases', icon: Wind, count: 6 },
  { id: 'conductividad', label: 'Conductividad', icon: Activity, count: 1 },
  { id: 'microsep', label: 'Microsep A y B', icon: Sliders, count: 8 },
  { id: 'molino', label: 'Molino y Elevadores', icon: Cpu, count: 4 }
];

export default function App() {
  const [selectedPeriod, setSelectedPeriod] = useState('Todo');
  const [activeTab, setActiveTab] = useState('etapa1');
  const [expandedChart, setExpandedChart] = useState(null);

  // Get KPIs for selected period
  const currentKpi = useMemo(() => {
    return kpisData[selectedPeriod] || kpisData['Todo'];
  }, [selectedPeriod]);

  // Get Chart Data depending on selected period
  const currentChartData = useMemo(() => {
    if (selectedPeriod === 'Todo') {
      return readingsDaily;
    }
    return readingsHourly.filter(r => r.month === selectedPeriod);
  }, [selectedPeriod]);

  // Tab Signal Configurations (34 Total Signals across 7 Tabs)
  const tabCharts = useMemo(() => {
    return {
      etapa1: [
        {
          title: 'Temperatura Etapa 1 – 1 (TT 411201)',
          dataKey: 'tt411201',
          unit: '°C',
          color: '#f5a623',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Temperatura Etapa 1 – 2 (TT 411202)',
          dataKey: 'tt411202',
          unit: '°C',
          color: '#f97316',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Temperatura Etapa 1 – 3 (TT 411203)',
          dataKey: 'tt411203',
          unit: '°C',
          color: '#fb923c',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Amperaje Etapa 1 (N411201)',
          dataKey: 'amp_etapa1',
          unit: 'A',
          color: '#a855f7'
        },
        {
          title: 'RPM Etapa 1 (N411201)',
          dataKey: 'rpm_etapa1',
          unit: 'RPM',
          color: '#3ba55d'
        }
      ],
      etapa2: [
        {
          title: 'Temperatura Etapa 2 – 1 (TT 411204)',
          dataKey: 'tt411204',
          unit: '°C',
          color: '#e11d48',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Temperatura Etapa 2 – 2 (TT 411205)',
          dataKey: 'tt411205',
          unit: '°C',
          color: '#f43f5e',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Temperatura Etapa 2 – 3 (TT 411206)',
          dataKey: 'tt411206',
          unit: '°C',
          color: '#ef4444',
          threshold: 150,
          thresholdLabel: 'Alarma >150°C'
        },
        {
          title: 'Amperaje Etapa 2 (N411202)',
          dataKey: 'amp_etapa2',
          unit: 'A',
          color: '#ec4899',
          threshold: 14,
          thresholdLabel: 'Alarma >14A'
        }
      ],
      alimentacion: [
        {
          title: 'Flujo Cal Viva (FIT 411102)',
          dataKey: 'flujo_cal',
          unit: 't/h',
          color: '#38bdf8'
        },
        {
          title: 'Flujo Agua (FIT 411201)',
          dataKey: 'flujo_agua',
          unit: 'm³/h',
          color: '#06b6d4'
        },
        {
          title: 'Amperaje Dosificador Cal (H411101)',
          dataKey: 'amp_h411101',
          unit: 'A',
          color: '#6366f1'
        },
        {
          title: 'RPM Alimentador Cal (H411101)',
          dataKey: 'rpm_h411101',
          unit: 'RPM',
          color: '#818cf8'
        },
        {
          title: 'Amperaje Bomba Agua (P411205)',
          dataKey: 'amp_bomba_agua',
          unit: 'A',
          color: '#0284c7'
        },
        {
          title: 'RPM Bomba Agua (P411205)',
          dataKey: 'rpm_bomba_agua',
          unit: 'RPM',
          color: '#38bdf8'
        }
      ],
      filtro: [
        {
          title: 'Temperatura Gases Escape Zeropoll (TT 411301)',
          dataKey: 'tt411301',
          unit: '°C',
          color: '#f59e0b'
        },
        {
          title: 'Presión Vacío Hidratador (PIT 411201)',
          dataKey: 'pit411201',
          unit: 'mbar',
          color: '#64748b'
        },
        {
          title: 'Presión Diferencial Filtro Zeropoll (PDIT 411301)',
          dataKey: 'presion_filtro',
          unit: 'mmH2O',
          color: '#94a3b8'
        },
        {
          title: 'Presión Diferencial Filtro (PDIT 440101)',
          dataKey: 'presion_filtro2',
          unit: 'mmH2O',
          color: '#cbd5e1'
        },
        {
          title: 'Amperaje Ventilador Zeropoll (U411302)',
          dataKey: 'amp_u411302',
          unit: 'A',
          color: '#10b981'
        },
        {
          title: 'RPM Ventilador Zeropoll (U411302)',
          dataKey: 'rpm_ventilador_filtro',
          unit: 'RPM',
          color: '#34d399'
        }
      ],
      conductividad: [
        {
          title: 'Índice Conductividad Hidrato (CIT 411201)',
          dataKey: 'cit411201',
          unit: 'µS/cm',
          color: '#8b5cf6'
        }
      ],
      microsep: [
        {
          title: 'Amperaje Separador Grado A',
          dataKey: 'amp_microsep_a',
          unit: 'A',
          color: '#0ea5e9'
        },
        {
          title: 'RPM Separador Grado A',
          dataKey: 'rpm_microsep_a',
          unit: 'RPM',
          color: '#38bdf8'
        },
        {
          title: 'Amperaje Ventilador Reciclaje Grado A',
          dataKey: 'amp_recyclingfan_a',
          unit: 'A',
          color: '#06b6d4'
        },
        {
          title: 'RPM Ventilador Reciclaje Grado A',
          dataKey: 'rpm_recyclingfan_a',
          unit: 'RPM',
          color: '#22d3ee'
        },
        {
          title: 'Amperaje Separador Grado B',
          dataKey: 'amp_microsep_b',
          unit: 'A',
          color: '#a855f7'
        },
        {
          title: 'RPM Separador Grado B',
          dataKey: 'rpm_microsep_b',
          unit: 'RPM',
          color: '#c084fc'
        },
        {
          title: 'Amperaje Ventilador Reciclaje Grado B',
          dataKey: 'amp_recyclingfan_b',
          unit: 'A',
          color: '#d8b4fe'
        },
        {
          title: 'RPM Ventilador Reciclaje Grado B',
          dataKey: 'rpm_recyclingfan_b',
          unit: 'RPM',
          color: '#e9d5ff'
        }
      ],
      molino: [
        {
          title: 'Amperaje Molino de Bolas',
          dataKey: 'amp_ballmill',
          unit: 'A',
          color: '#14b8a6'
        },
        {
          title: 'RPM Molino de Bolas',
          dataKey: 'rpm_ballmill',
          unit: 'RPM',
          color: '#2dd4bf'
        },
        {
          title: 'Amperaje Elevador Cangilones H413101',
          dataKey: 'amp_h413101',
          unit: 'A',
          color: '#f43f5e'
        },
        {
          title: 'Amperaje Elevador Cangilones H412101',
          dataKey: 'amp_h412101',
          unit: 'A',
          color: '#fb7185'
        }
      ]
    };
  }, []);

  const activeCharts = tabCharts[activeTab] || [];

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <Header
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
      />

      {/* KPI Cards Row */}
      <section className="kpi-grid">
        <KpiCard
          title="Flujo Cal Viva Prom."
          value={currentKpi ? currentKpi.flujo_cal_avg : 'N/A'}
          unit="t/h"
          icon={Zap}
          accentColor="#38bdf8"
        />

        <KpiCard
          title="Flujo Agua Prom."
          value={currentKpi ? currentKpi.flujo_agua_avg : 'N/A'}
          unit="m³/h"
          icon={Droplets}
          accentColor="#06b6d4"
        />

        <KpiCard
          title="Tiempo Operativo"
          value={currentKpi ? `${currentKpi.pct_on}%` : 'N/A'}
          unit="Disponibilidad global"
          icon={CheckCircle2}
          accentColor="#3ba55d"
          badge={currentKpi && currentKpi.pct_on >= 90 ? 'Excelente' : 'Aceptable'}
          badgeType={currentKpi && currentKpi.pct_on >= 90 ? 'success' : 'warning'}
        />

        <KpiCard
          title="Paros & Tiempo Detenido"
          value={currentKpi ? `${currentKpi.numero_paros} paros` : 'N/A'}
          unit={currentKpi ? `${currentKpi.tiempo_total_detenido_hrs} hrs detenido` : ''}
          icon={AlertOctagon}
          accentColor="#f5a623"
          badge={`${currentKpi ? currentKpi.tiempo_total_detenido_min : 0} min total`}
          badgeType="warning"
        />

        <KpiCard
          title="Alarmas Temperatura"
          value={currentKpi ? currentKpi.alarmas_temperatura : '0'}
          unit="Lecturas > 150°C"
          icon={Thermometer}
          accentColor="#e5484d"
          badge={currentKpi && currentKpi.alarmas_temperatura > 0 ? `${currentKpi.alarmas_temperatura} Eventos` : 'Sin alarmas'}
          badgeType={currentKpi && currentKpi.alarmas_temperatura > 0 ? 'danger' : 'success'}
        />

        <KpiCard
          title="Alarmas Amperaje Etapa 2"
          value={currentKpi ? currentKpi.alarmas_amperaje_etapa2 : '0'}
          unit="Lecturas > 14A"
          icon={Activity}
          accentColor="#ec4899"
          badge={currentKpi && currentKpi.alarmas_amperaje_etapa2 > 0 ? `${currentKpi.alarmas_amperaje_etapa2} Eventos` : 'Sin alarmas'}
          badgeType={currentKpi && currentKpi.alarmas_amperaje_etapa2 > 0 ? 'danger' : 'success'}
        />
      </section>

      {/* Downtime Timeline */}
      <DowntimeTimeline
        downtimeList={downtimeData}
        selectedPeriod={selectedPeriod}
        kpiData={currentKpi}
      />

      {/* Category Tabs Navigation */}
      <nav className="chart-tabs-header">
        {TABS.map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`chart-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComp size={16} />
              <span>{tab.label}</span>
              <span className="tab-badge">{tab.count}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Tab Charts Grid */}
      <section className="section-panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
        <div className="section-title-bar" style={{ marginBottom: '16px' }}>
          <div className="section-title">
            <Layers size={18} />
            <span>
              Gráficas de Tendencia — {TABS.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mostrando datos: <strong style={{ color: 'var(--text-main)' }}>
              {selectedPeriod === 'Todo' ? 'Promedios Diarios (4 Meses)' : `Promedios Horarios (${selectedPeriod})`}
            </strong>
          </div>
        </div>

        <div className={`charts-grid ${activeTab === 'conductividad' ? 'single-chart' : ''}`}>
          {activeCharts.map((cfg) => (
            <ChartPanel
              key={cfg.dataKey}
              title={cfg.title}
              dataKey={cfg.dataKey}
              unit={cfg.unit}
              data={currentChartData}
              rawReadings={readingsRaw}
              color={cfg.color}
              threshold={cfg.threshold}
              thresholdLabel={cfg.thresholdLabel}
              onExpand={setExpandedChart}
            />
          ))}
        </div>
      </section>

      {/* Fullscreen Expand Modal */}
      {expandedChart && (
        <ExpandModal
          chartConfig={expandedChart}
          data={currentChartData}
          rawReadings={readingsRaw}
          selectedPeriod={selectedPeriod}
          onClose={() => setExpandedChart(null)}
        />
      )}
    </div>
  );
}
