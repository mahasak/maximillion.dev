import colors from 'colors';
import { createLogger, transports, format } from "winston";
import { SeqTransport } from "@datalust/winston-seq";
import { redisClient } from "./cache";
import { FemtoLogLevel } from "./types"

export const debug = (label: string, ...data: any[]) => {
  console.log(colors.yellow(`---------- debug: ${label} ----------`))
  data.forEach(item => console.log(colors.yellow(item)))
}

export const log = async (level: FemtoLogLevel, trace_id: string, contents: any) => {
  const log_object = {
    level: level,
    trace_id: trace_id,
    contents: contents
  }
  await redisClient.publish('logger', JSON.stringify(log_object));
}

export const debug_log = async (trace_id: string, contents: any) => {
  await log(FemtoLogLevel.DEBUG, trace_id, contents);
}

export const info_log = async (trace_id: string, contents: any) => {
  await log(FemtoLogLevel.INFO, trace_id, contents);
}

export const warn_log = async (trace_id: string, contents: any) => {
  await log(FemtoLogLevel.WARN, trace_id, contents);
}

export const verbose_log = async (trace_id: string, contents: any) => {
  await log(FemtoLogLevel.VERBOSE, trace_id, contents);
}

export const error_log = async (trace_id: string, contents: any) => {
  await log(FemtoLogLevel.ERROR, trace_id, contents);
}

const SEQ_SERVER = process.env.SEQ_SERVER ?? ""
const SEQ_API_KEY = process.env.SEQ_API_KEY ?? ""

const seqTransport = new SeqTransport({
  serverUrl: SEQ_SERVER,
  apiKey: SEQ_API_KEY,
  onError: ((e: any) => {
    console.error(e)
  }),
  handleExceptions: true,
  handleRejections: true,
});

export type LoggingMetadata = {
  applicationName?: string;
  module?: string;
  service?: string;
  country?: number;
};

console.log(seqTransport)

export const getLogger = (metadata?: LoggingMetadata) => {
  const defaultMetadata = {
    application: process.env.APPLICATION_NAME,
  }

  const parameterizeMetadata = metadata ?? { service: "none" }
  const allowTransport = []
  if (process.env.LOG_TO_CONSOLE === "1") {
    allowTransport.push(new transports.Console())
  }
  
  if (process.env.LOG_TO_SEQ === "1") {
    allowTransport.push(seqTransport)
  }
  
  return createLogger({
    transports: allowTransport,
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(({ timestamp, level, message, service }) => {
        return `[${timestamp}] ${service} ${level}: ${message}`;
      })
    ),
    defaultMeta: { ...defaultMetadata, ...parameterizeMetadata },
  });
}
