import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';

// Gap threshold in minutes to consider a downtime event (Paro)
const GAP_THRESHOLD_MINUTES = 15;

const FIELD_MAP = {
  'DTH': 'timestamp',
  'Hydrator 1° stage temperature 1 TT 411201': 'tt411201',
  'Hydrator 1° stage temperature 2 TT411202': 'tt411202',
  'Hydrator 1° stage temperature 3 TT411203': 'tt411203',
  'Hydrator 2° stage temperature 1 TT411204': 'tt411204',
  'Hydrator 2° stage temperature 2 TT411205': 'tt411205',
  'Hydrator 2° stage temperature 3 TT411206': 'tt411206',
  'CIM-ZEROPOLL filter waste gases temperature TT411301': 'tt411301',
  'Quicklime fed to hydrator ACTUAL FIT 411102': 'flujo_cal',
  'Water fed to hydrator ACTUAL FIT 411201': 'flujo_agua',
  'Hydrator underpressure zeropoll PIT411201': 'pit411201',
  'Hydrate conductivity index CIT 411201': 'cit411201',
  'Hydrator 1° stage motor current N411201': 'amp_etapa1',
  'Hydrator 2° stage motor current N411202': 'amp_etapa2',
  'CIM-DIGIDOSER Dosing Screw Conveyor - Motor Current (A)': 'amp_h411101',
  'Hydrator pump motor current P411205': 'amp_bomba_agua',
  'CIM-MICROSEP - Separator Grade A - Motor Current': 'amp_microsep_a',
  'CIM-MICROSEP - Recycling Fan Grade A - Motor Current': 'amp_recyclingfan_a',
  'CIM-MICROSEP - Separator Grade B - Motor Current': 'amp_microsep_b',
  'CIM-MICROSEP - Recycling Fan Grade B - Motor Current': 'amp_recyclingfan_b',
  'Ball mill motor current': 'amp_ballmill',
  'Motor current bucket elevator H413101': 'amp_h413101',
  'Zeropoll filter fan motor curent U411302': 'amp_u411302',
  'Motor current bucket elevator H412101': 'amp_h412101',
  'Motor speed first stage N411201': 'rpm_etapa1',
  'Motor speed quicklime fed H411101': 'rpm_h411101',
  'CIM-MICROSEP - Separator Grade A - Motor speed': 'rpm_microsep_a',
  'CIM-MICROSEP - Recycling Fan Grade A - Motor speed': 'rpm_recyclingfan_a',
  'CIM-MICROSEP - Separator Grade B - Motor speed': 'rpm_microsep_b',
  'CIM-MICROSEP - Recycling Fan Grade B - Motor speed': 'rpm_recyclingfan_b',
  'Motor speed water feed P411205': 'rpm_bomba_agua',
  'CIM-ZEROPOLL fan - Motor speed U411302': 'rpm_ventilador_filtro',
  'Motor speed ball mill (rpm)': 'rpm_ballmill',
  'Delta pressure filter zeropoll PDIT411301 (mmH2O)': 'presion_filtro',
  'Delta pressure filter PDIT440101 (mmH2O)': 'presion_filtro2'
};

const NUMERIC_FIELDS = Object.values(FIELD_MAP).filter(f => f !== 'timestamp');

const FILES = [
  { file: 'Data_May.xls', month: 'Mayo', monthNum: 5, daysInMonth: 31 },
  { file: 'Data_June.xls', month: 'Junio', monthNum: 6, daysInMonth: 30 },
  { file: 'Data_July.xls', month: 'Julio', monthNum: 7, daysInMonth: 31 },
  { file: 'Data_August.xls', month: 'Agosto', monthNum: 8, daysInMonth: 31 }
];

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '' || isNaN(val)) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function processData() {
  const allRows = [];
  const countsPerFile = {};

  FILES.forEach(({ file, month, monthNum }) => {
    const filePath = path.resolve(file);
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headerRowIdx = rawData.findIndex(r => r && r.includes && r.includes('DTH'));
    if (headerRowIdx === -1) {
      console.error(`Header not found in ${file}`);
      return;
    }

    const headers = rawData[headerRowIdx].map(h => typeof h === 'string' ? h.trim() : h);
    const colIndices = {};

    Object.entries(FIELD_MAP).forEach(([origName, targetField]) => {
      const idx = headers.indexOf(origName);
      if (idx !== -1) colIndices[targetField] = idx;
    });

    const rows = rawData.slice(headerRowIdx + 1);
    countsPerFile[file] = 0;

    rows.forEach(r => {
      if (!r || r.length === 0) return;
      const rawDTH = r[colIndices['timestamp']];
      if (!rawDTH) return;

      const dateObj = new Date(rawDTH);
      if (isNaN(dateObj.getTime())) return;

      const yyyy = dateObj.getUTCFullYear();
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const parsedRow = {
        timestamp: dateObj.toISOString(),
        date: dateStr,
        dateObj: dateObj,
        month: month,
        monthNum: monthNum
      };

      NUMERIC_FIELDS.forEach(field => {
        const val = r[colIndices[field]];
        parsedRow[field] = parseNumber(val);
      });

      allRows.push(parsedRow);
      countsPerFile[file]++;
    });
  });

  // Sort all rows chronologically across all 4 months
  allRows.sort((a, b) => a.dateObj - b.dateObj);

  // 1. Process Downtime (Paros) based on TIME GAPS > 15 minutes between consecutive rows
  const downtimeList = [];

  for (let i = 1; i < allRows.length; i++) {
    const prevRow = allRows[i - 1];
    const currRow = allRows[i];

    const diffMs = currRow.dateObj - prevRow.dateObj;
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes > GAP_THRESHOLD_MINUTES) {
      downtimeList.push({
        id: downtimeList.length + 1,
        start: prevRow.timestamp,
        end: currRow.timestamp,
        durationMinutes: round(diffMinutes, 1),
        month: prevRow.month
      });
    }
  }

  // 2. Prepare raw readings for readings_raw.json (clean format, without dateObj)
  const readingsRaw = allRows.map(r => {
    const item = {
      timestamp: r.timestamp,
      date: r.date,
      month: r.month
    };
    NUMERIC_FIELDS.forEach(f => {
      item[f] = r[f];
    });
    return item;
  });

  // 3. Process hourly readings (readings_hourly.json)
  const hourlyGroups = new Map();
  allRows.forEach(row => {
    const d = row.dateObj;
    const year = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hour = String(d.getUTCHours()).padStart(2, '0');
    const hourKey = `${year}-${m}-${day}T${hour}:00:00.000Z`;

    if (!hourlyGroups.has(hourKey)) {
      hourlyGroups.set(hourKey, {
        timestamp: hourKey,
        month: row.month,
        monthNum: row.monthNum,
        rows: []
      });
    }
    hourlyGroups.get(hourKey).rows.push(row);
  });

  const readingsHourly = [];
  hourlyGroups.forEach((group, hourKey) => {
    const item = {
      timestamp: hourKey,
      month: group.month,
      monthNum: group.monthNum
    };

    NUMERIC_FIELDS.forEach(field => {
      const validVals = group.rows.map(r => r[field]).filter(v => v !== null);
      if (validVals.length > 0) {
        const avg = validVals.reduce((a, b) => a + b, 0) / validVals.length;
        item[field] = round(avg, 2);
      } else {
        item[field] = null;
      }
    });

    readingsHourly.push(item);
  });
  readingsHourly.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // 4. Process daily readings (readings_daily.json)
  const dailyGroups = new Map();
  allRows.forEach(row => {
    const dateKey = row.date;
    if (!dailyGroups.has(dateKey)) {
      dailyGroups.set(dateKey, {
        date: dateKey,
        month: row.month,
        monthNum: row.monthNum,
        rows: []
      });
    }
    dailyGroups.get(dateKey).rows.push(row);
  });

  const readingsDaily = [];
  dailyGroups.forEach((group, dateKey) => {
    const item = {
      date: dateKey,
      month: group.month,
      monthNum: group.monthNum
    };

    NUMERIC_FIELDS.forEach(field => {
      const validVals = group.rows.map(r => r[field]).filter(v => v !== null);
      if (validVals.length > 0) {
        const avg = validVals.reduce((a, b) => a + b, 0) / validVals.length;
        item[field] = round(avg, 2);
      } else {
        item[field] = null;
      }
    });

    readingsDaily.push(item);
  });
  readingsDaily.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 5. Calculate KPIs by month & overall (kpis_by_month.json)
  const tempFields = ['tt411201', 'tt411202', 'tt411203', 'tt411204', 'tt411205', 'tt411206'];
  const kpisByMonth = {};

  FILES.forEach(({ month, daysInMonth }) => {
    const monthRows = allRows.filter(r => r.month === month);
    const monthDowntime = downtimeList.filter(d => d.month === month);

    const totalRows = monthRows.length;
    const totalDowntimeMin = round(monthDowntime.reduce((sum, d) => sum + d.durationMinutes, 0), 1);
    const totalDowntimeHrs = round(totalDowntimeMin / 60, 1);

    // Total minutes in calendar month
    const totalMonthMinutes = daysInMonth * 24 * 60;
    // % de tiempo en operación = 1 - (suma de duración de paros / total minutos del mes)
    const pctOn = round((1 - (totalDowntimeMin / totalMonthMinutes)) * 100, 1);

    // Temp alarms (> 150°C in temperature sensors)
    let tempAlarmsCount = 0;
    monthRows.forEach(r => {
      tempFields.forEach(tf => {
        if (r[tf] !== null && r[tf] > 150) tempAlarmsCount++;
      });
    });

    // Amperage alarms Etapa 2 (> 14A)
    let ampEtapa2AlarmsCount = 0;
    monthRows.forEach(r => {
      if (r.amp_etapa2 !== null && r.amp_etapa2 > 14) ampEtapa2AlarmsCount++;
    });

    const calcFieldStats = (field) => {
      const valid = monthRows.map(r => r[field]).filter(v => v !== null);
      if (valid.length === 0) return { avg: null, min: null, max: null };
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      return {
        avg: round(avg, 2),
        min: round(Math.min(...valid), 2),
        max: round(Math.max(...valid), 2)
      };
    };

    const statsObj = {};
    NUMERIC_FIELDS.forEach(field => {
      statsObj[field] = calcFieldStats(field);
    });

    kpisByMonth[month] = {
      month: month,
      total_rows: totalRows,
      flujo_cal_avg: calcFieldStats('flujo_cal').avg,
      flujo_agua_avg: calcFieldStats('flujo_agua').avg,
      pct_on: pctOn,
      numero_paros: monthDowntime.length,
      tiempo_total_detenido_min: totalDowntimeMin,
      tiempo_total_detenido_hrs: totalDowntimeHrs,
      alarmas_temperatura: tempAlarmsCount,
      alarmas_amperaje_etapa2: ampEtapa2AlarmsCount,
      stats: statsObj
    };
  });

  // Calculate Overall ("Todo el período")
  const totalRowsAll = allRows.length;
  const totalDowntimeMinAll = round(downtimeList.reduce((sum, d) => sum + d.durationMinutes, 0), 1);
  const totalDowntimeHrsAll = round(totalDowntimeMinAll / 60, 1);
  const totalPeriodMinutes = (31 + 30 + 31 + 31) * 24 * 60; // 177,120 min
  const pctOnAll = round((1 - (totalDowntimeMinAll / totalPeriodMinutes)) * 100, 1);

  let tempAlarmsCountAll = 0;
  let ampEtapa2AlarmsCountAll = 0;
  allRows.forEach(r => {
    tempFields.forEach(tf => {
      if (r[tf] !== null && r[tf] > 150) tempAlarmsCountAll++;
    });
    if (r.amp_etapa2 !== null && r.amp_etapa2 > 14) ampEtapa2AlarmsCountAll++;
  });

  const calcAllFieldStats = (field) => {
    const valid = allRows.map(r => r[field]).filter(v => v !== null);
    if (valid.length === 0) return { avg: null, min: null, max: null };
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return {
      avg: round(avg, 2),
      min: round(Math.min(...valid), 2),
      max: round(Math.max(...valid), 2)
    };
  };

  const statsObjAll = {};
  NUMERIC_FIELDS.forEach(field => {
    statsObjAll[field] = calcAllFieldStats(field);
  });

  kpisByMonth['Todo'] = {
    month: 'Todo el período',
    total_rows: totalRowsAll,
    flujo_cal_avg: calcAllFieldStats('flujo_cal').avg,
    flujo_agua_avg: calcAllFieldStats('flujo_agua').avg,
    pct_on: pctOnAll,
    numero_paros: downtimeList.length,
    tiempo_total_detenido_min: totalDowntimeMinAll,
    tiempo_total_detenido_hrs: totalDowntimeHrsAll,
    alarmas_temperatura: tempAlarmsCountAll,
    alarmas_amperaje_etapa2: ampEtapa2AlarmsCountAll,
    stats: statsObjAll
  };

  // Save JSON files into src/data/
  const dataDir = path.resolve('src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const rawFile = path.join(dataDir, 'readings_raw.json');
  const hourlyFile = path.join(dataDir, 'readings_hourly.json');
  const dailyFile = path.join(dataDir, 'readings_daily.json');
  const downtimeFile = path.join(dataDir, 'downtime.json');
  const kpisFile = path.join(dataDir, 'kpis_by_month.json');

  fs.writeFileSync(rawFile, JSON.stringify(readingsRaw));
  fs.writeFileSync(hourlyFile, JSON.stringify(readingsHourly));
  fs.writeFileSync(dailyFile, JSON.stringify(readingsDaily));
  fs.writeFileSync(downtimeFile, JSON.stringify(downtimeList, null, 2));
  fs.writeFileSync(kpisFile, JSON.stringify(kpisByMonth, null, 2));

  // Console Summary
  console.log('\n======================================================');
  console.log('    RESUMEN DE PROCESAMIENTO DE DATOS & PAROS POR HUECO ');
  console.log(`    (Umbral de Paro: > ${GAP_THRESHOLD_MINUTES} minutos de inactividad)`);
  console.log('======================================================');
  console.log('Paros y tiempo detenido por mes:');
  FILES.forEach(({ month }) => {
    const kpi = kpisByMonth[month];
    console.log(`  - ${month.padEnd(8)}: ${String(kpi.numero_paros).padStart(3)} paros | ${kpi.tiempo_total_detenido_min.toLocaleString()} min (${kpi.tiempo_total_detenido_hrs} hrs) | Operación: ${kpi.pct_on}%`);
  });
  const kpiTodo = kpisByMonth['Todo'];
  console.log('  ----------------------------------------------------');
  console.log(`  - TOTAL   : ${String(kpiTodo.numero_paros).padStart(3)} paros | ${kpiTodo.tiempo_total_detenido_min.toLocaleString()} min (${kpiTodo.tiempo_total_detenido_hrs} hrs) | Operación: ${kpiTodo.pct_on}%`);
  console.log('------------------------------------------------------');
  console.log('Archivos JSON guardados en src/data/:');
  console.log(`  - readings_raw.json    : ${readingsRaw.length} filas originales (Tamaño: ${(fs.statSync(rawFile).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  - readings_hourly.json : ${readingsHourly.length} puntos por hora (Tamaño: ${(fs.statSync(hourlyFile).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  - readings_daily.json  : ${readingsDaily.length} puntos por día (Tamaño: ${(fs.statSync(dailyFile).size / 1024).toFixed(2)} KB)`);
  console.log(`  - downtime.json        : ${downtimeList.length} paros detectados (Tamaño: ${(fs.statSync(downtimeFile).size / 1024).toFixed(2)} KB)`);
  console.log(`  - kpis_by_month.json   : ${Object.keys(kpisByMonth).length} periodos calculados (Tamaño: ${(fs.statSync(kpisFile).size / 1024).toFixed(2)} KB)`);
  console.log('======================================================\n');
}

processData();
