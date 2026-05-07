// Imperial/metric formatting for length and area.
// Inputs are SI: meters for length, square meters for area.

export const M_TO_FT = 3.28084;
export const SQM_TO_SQFT = 10.7639;
export const SQFT_PER_ACRE = 43560;
export const FT_PER_MILE = 5280;

export function formatLengthMeters(lengthMeters, units) {
  if (units === 'imperial') {
    const lengthFeet = lengthMeters * M_TO_FT;
    if (lengthFeet > FT_PER_MILE) return `${(lengthFeet / FT_PER_MILE).toFixed(2)} mi`;
    return `${lengthFeet.toFixed(2)} ft`;
  }
  if (lengthMeters > 100) return `${(lengthMeters / 1000).toFixed(2)} km`;
  return `${lengthMeters.toFixed(2)} m`;
}

export function formatAreaSqMeters(areaSqMeters, units) {
  if (units === 'imperial') {
    const areaSqFt = areaSqMeters * SQM_TO_SQFT;
    if (areaSqFt > SQFT_PER_ACRE) return `${(areaSqFt / SQFT_PER_ACRE).toFixed(2)} acres`;
    return `${areaSqFt.toFixed(2)} ft<sup>2</sup>`;
  }
  if (areaSqMeters > 10000) return `${(areaSqMeters / 1000000).toFixed(2)} km<sup>2</sup>`;
  return `${areaSqMeters.toFixed(2)} m<sup>2</sup>`;
}

export function formatAreaImperialBoth(areaSqMeters) {
  const areaSqFt = areaSqMeters * SQM_TO_SQFT;
  return {
    sqft: `${areaSqFt.toFixed(2)} ft<sup>2</sup>`,
    acres: `${(areaSqFt / SQFT_PER_ACRE).toFixed(3)} acres`
  };
}
