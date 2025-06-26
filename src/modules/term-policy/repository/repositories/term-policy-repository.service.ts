import { Injectable } from '@nestjs/common';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { Model } from 'mongoose';
import {
    TermPolicyDoc,
    TermPolicyEntity,
} from '@modules/term-policy/repository/entities/term-policy.entity';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';

@Injectable()
export class TermPolicyRepository extends DatabaseUUIDRepositoryBase<
    TermPolicyEntity,
    TermPolicyDoc
> {
    constructor(
        @InjectDatabaseModel(TermPolicyEntity.name)
        private readonly termPolicyModel: Model<TermPolicyEntity>
    ) {
        super(termPolicyModel);
    }
}
