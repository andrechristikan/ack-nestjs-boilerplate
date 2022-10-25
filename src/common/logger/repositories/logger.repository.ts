import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import { Logger, LoggerEntity } from 'src/common/logger/schemas/logger.schema';
@Injectable()
export class LoggerRepository
    extends DatabaseMongoRepositoryAbstract<Logger>
    implements IDatabaseRepositoryAbstract<Logger>
{
    constructor(
        @DatabaseRepository(LoggerEntity.name)
        private readonly loggerModel: Model<Logger>
    ) {
        super(loggerModel);
    }
}
