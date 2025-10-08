import {
  Accessor,
} from "ags";
import { DiskInfo } from "utils/hwmonitor";

export interface MetricConfig {
  type: "bar" | "display";
  label: string;
  value?: number | Accessor<number>;
  icon?: string;
  detail: string | Accessor<string>;
  tooltip?: string | Accessor<string>;
}

export interface PageConfig {
  id: string;
  label: string;
  icon: string;
  mainPercentage: Accessor<number>;
  mainLabel: Accessor<string>;
  mainTooltip: string | Accessor<string>;
  leftMetric: MetricConfig;
  rightMetric: MetricConfig;
  diskList?: Accessor<DiskInfo[]>;
}
