import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { LoggerEntity } from 'src/common/logger/repository/entities/logger.entity';
import { LoggerMongoEntity } from 'src/common/logger/repository/entities/logger.mongo.entity';

@Injectable()
export class LoggerMongoRepository
    extends DatabaseMongoRepositoryAbstract<LoggerMongoEntity>
    implements IDatabaseRepository<LoggerMongoEntity>
{
    constructor(
        @DatabaseMongoModel(LoggerEntity)
        private readonly loggerModel: Model<LoggerMongoEntity>
    ) {
        super(loggerModel);
    }
}
