import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    SessionDoc,
    SessionEntity,
} from '@modules/session/repository/entities/session.entity';

@Injectable()
export class SessionRepository extends DatabaseUUIDRepositoryBase<
    SessionEntity,
    SessionDoc
> {
    constructor(
        @InjectDatabaseModel(SessionEntity.name)
        private readonly sessionModel: Model<SessionEntity>
    ) {
        super(sessionModel);
    }
}
