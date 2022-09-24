import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import {
    LoggerDocument,
    LoggerEntity,
} from 'src/common/logger/schemas/logger.schema';
@Injectable()
export class LoggerRepository
    extends DatabaseMongoRepositoryAbstract<LoggerDocument>
    implements IDatabaseRepositoryAbstract<LoggerDocument>
{
    constructor(
        @DatabaseEntity(LoggerEntity.name)
        private readonly loggerModel: Model<LoggerDocument>
    ) {
        super(loggerModel);
    }
}
