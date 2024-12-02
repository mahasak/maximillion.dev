export const enum FemtoLogLevel {
  DEBUG,
  VERBOSE,
  INFO,
  WARN,
  ERROR
}

export interface FemtoLogRecord {
  timestamp: number;
  level?: FemtoLogLevel;
  country?: string;
  service?: string;
  channel?: string;
  object_id?: string;
  message: string;
  extra_data?: any;
}

export interface P2MSessionData {
  order_id: string;
  invoice_id: string;
}

export interface LogFormat {
  level: string,
  module: string,
  trace_id: string,
  message: string
}
