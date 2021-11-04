import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface IDebuggerOptions {
    format: winston.Logform.Format;
    transports: (
        | DailyRotateFile
        | winston.transports.ConsoleTransportInstance
    )[];
}
