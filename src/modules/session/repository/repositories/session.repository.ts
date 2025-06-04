import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from 'src/common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    SessionDoc,
    SessionEntity,
} from 'src/modules/session/repository/entities/session.entity';

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
