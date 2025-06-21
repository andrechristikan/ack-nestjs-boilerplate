import { Injectable } from '@nestjs/common';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { Model } from 'mongoose';
import {
    TermsPolicyDoc,
    TermsPolicyEntity,
} from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';

@Injectable()
export class TermsPolicyRepository extends DatabaseUUIDRepositoryBase<
    TermsPolicyEntity,
    TermsPolicyDoc
> {
    constructor(
        @InjectDatabaseModel(TermsPolicyEntity.name)
        private readonly termsPolicyModel: Model<TermsPolicyEntity>
    ) {
        super(termsPolicyModel);
    }
}
