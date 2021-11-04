import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerService } from 'src/logger/logger.service';
import {
    LoggerDatabaseName,
    LoggerEntity,
    LoggerSchema
} from './logger.schema';

@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: [
        MongooseModule.forFeature([
            {
                name: LoggerEntity.name,
                schema: LoggerSchema,
                collection: LoggerDatabaseName
            }
        ])
    ]
})
export class LoggerModule {}
