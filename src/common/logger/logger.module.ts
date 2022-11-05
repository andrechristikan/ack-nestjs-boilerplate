import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';
import { LoggerRepository } from 'src/common/logger/repository/entities/logger.entity';
import {
    LoggerMongoEntity,
    LoggerMongoSchema,
} from 'src/common/logger/repository/entities/logger.mongo.entity';
import { LoggerPostgresEntity } from 'src/common/logger/repository/entities/logger.postgres.entity';
import { LoggerMongoRepository } from 'src/common/logger/repository/repositories/logger.mongo.repository';
import { LoggerPostgresRepository } from 'src/common/logger/repository/repositories/logger.postgres.repository';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: LoggerRepository,
            mongo: {
                schema: LoggerMongoSchema,
                entity: LoggerMongoEntity,
                repository: LoggerMongoRepository,
            },
            postgres: {
                entity: LoggerPostgresEntity,
                repository: LoggerPostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class LoggerModule {}
