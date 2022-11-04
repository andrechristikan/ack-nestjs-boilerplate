import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    LoggerDatabaseName,
    LoggerEntity,
    LoggerRepositoryName,
} from 'src/common/logger/repository/entities/logger.entity';
import { LoggerMongoSchema } from 'src/common/logger/repository/entities/logger.mongo.entity';
import { LoggerMongoRepository } from 'src/common/logger/repository/repositories/logger.mongo.repository';

const provider = {
    useClass: LoggerMongoRepository,
    provide: LoggerRepositoryName,
};

@Module({
    providers: [provider],
    exports: [provider],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: LoggerEntity.name,
                    schema: LoggerMongoSchema,
                    collection: LoggerDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class LoggerRepositoryModule {}
