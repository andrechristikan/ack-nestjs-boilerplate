import { LoggerEntity } from 'src/logger/logger.schema';
import { Document } from 'mongoose';

export type LoggerDocument = LoggerEntity & Document;
