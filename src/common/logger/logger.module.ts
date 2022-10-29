import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { LoggerRepository } from 'src/common/logger/repositories/logger.repository';
import {
    LoggerSchema,
    LoggerDatabaseName,
    LoggerEntity,
} from './schemas/logger.schema';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
    providers: [LoggerService, LoggerRepository],
    exports: [LoggerService],
    imports: [
        DatabaseConnectModule.register({
            name: LoggerEntity.name,
            schema: LoggerSchema,
            collection: LoggerDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class LoggerModule {}
