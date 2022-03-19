import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import {
    LoggerDatabaseName,
    LoggerEntity,
    LoggerSchema,
} from './schema/logger.schema';
import { LoggerService } from './service/logger.service';

@Global()
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
