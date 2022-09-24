import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { LoggerRepository } from 'src/common/logger/repositories/logger.repository';
import {
    LoggerDatabaseName,
    LoggerEntity,
    LoggerSchema,
} from './schemas/logger.schema';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
    providers: [LoggerService, LoggerRepository],
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
