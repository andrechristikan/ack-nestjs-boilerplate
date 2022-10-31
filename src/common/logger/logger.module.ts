import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { LOGGER_REPOSITORY } from 'src/common/logger/constants/logger.constant';
import { LoggerMongoRepository } from 'src/common/logger/repositories/logger.mongo.repository';
import { LoggerPostgresRepository } from 'src/common/logger/repositories/logger.postgres.repository';
import { LoggerMongoSchema } from 'src/common/logger/schemas/logger.mongo.schema';
import { LoggerPostgresSchema } from 'src/common/logger/schemas/logger.postgres.schema';
import { LoggerEntity, LoggerDatabaseName } from './schemas/logger.schema';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: [
        DatabaseConnectModule.register({
            schema: {
                name: LoggerEntity.name,
                mongo: LoggerMongoSchema,
                postgres: LoggerPostgresSchema,
            },
            repository: {
                name: LOGGER_REPOSITORY,
                mongo: LoggerMongoRepository,
                postgres: LoggerPostgresRepository,
            },
            collection: LoggerDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class LoggerModule {}
