export type MeasurementDraft={unit:'cm'|'inch';values:Record<string,string>};
export const measurementKeys=['length','bust','sleeve','forearm'] as const;
export function measurementsComplete(draft:MeasurementDraft){return measurementKeys.every(key=>{const n=Number(draft.values[key]);return Number.isFinite(n)&&n>0&&n<=(draft.unit==='cm'?300:120);});}
