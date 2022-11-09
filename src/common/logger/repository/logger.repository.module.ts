import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    LoggerEntity,
    LoggerSchema,
} from 'src/common/logger/repository/entities/logger.entity';
import { LoggerRepository } from 'src/common/logger/repository/repositories/logger.mongo.repository';

@Module({
    providers: [LoggerRepository],
    exports: [LoggerRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: LoggerEntity.name,
                    schema: LoggerSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class LoggerRepositoryModule {}
