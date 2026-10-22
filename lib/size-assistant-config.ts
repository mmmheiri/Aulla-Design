import type {ApprovedSizeChart} from './size-assistant';
import savedCharts from './size-charts.json';
import {validateSizeCharts} from './size-chart-validation';
import {sourceProducts} from './source-catalogue';

/** Fill per-product ranges only after owner/tailor approval; no borrowed size rules. */
export const productSizeCharts:Readonly<Record<string,ApprovedSizeChart>> = validateSizeCharts(savedCharts,sourceProducts).charts;
