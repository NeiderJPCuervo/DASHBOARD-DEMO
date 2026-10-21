// A signal has "no signal" when nearly every reading is the same value close
// to zero: the sensor is out of service or the historian is not recording it.
// Requiring a near-zero value keeps fixed-speed motors (e.g. a fan always at
// 1780 RPM) from being flagged.
const FLAT_SHARE = 0.98;
const NEAR_ZERO = 0.1;

export function detectNoSignal(readings, fields) {
  const result = {};

  fields.forEach(field => {
    const counts = new Map();
    let total = 0;

    readings.forEach(r => {
      const v = r[field];
      if (v === null || v === undefined) return;
      counts.set(v, (counts.get(v) || 0) + 1);
      total++;
    });

    let modeValue = null;
    let modeCount = 0;
    counts.forEach((count, value) => {
      if (count > modeCount) {
        modeValue = value;
        modeCount = count;
      }
    });

    result[field] = total === 0 ||
      (modeCount / total >= FLAT_SHARE && Math.abs(modeValue) < NEAR_ZERO);
  });

  return result;
}
