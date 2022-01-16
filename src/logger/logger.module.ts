import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { LoggerService } from 'src/logger/logger.service';
import {
    LoggerDatabaseName,
    LoggerEntity,
    LoggerSchema,
} from './logger.schema';

@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: LoggerEntity.name,
                    schema: LoggerSchema,
                    collection: LoggerDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class LoggerModule {}
