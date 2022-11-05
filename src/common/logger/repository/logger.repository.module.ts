import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { LoggerDatabaseName } from 'src/common/logger/repository/entities/logger.entity';
import {
    LoggerMongoEntity,
    LoggerMongoSchema,
} from 'src/common/logger/repository/entities/logger.mongo.entity';
import { LoggerRepositoryProvider } from 'src/common/logger/repository/providers/logger.repository.provider';

@Module({
    providers: [LoggerRepositoryProvider],
    exports: [LoggerRepositoryProvider],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: LoggerMongoEntity.name,
                    schema: LoggerMongoSchema,
                    collection: LoggerDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class LoggerRepositoryModule {}
