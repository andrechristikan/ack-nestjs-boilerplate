import { Injectable } from '@nestjs/common';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { Model } from 'mongoose';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import {
    TermPolicyAcceptanceDoc,
    TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';

@Injectable()
export class TermPolicyAcceptanceRepository extends DatabaseUUIDRepositoryBase<
    TermPolicyAcceptanceEntity,
    TermPolicyAcceptanceDoc
> {
    constructor(
        @InjectDatabaseModel(TermPolicyAcceptanceEntity.name)
        private readonly termPolicyAcceptanceModel: Model<TermPolicyAcceptanceEntity>
    ) {
        super(termPolicyAcceptanceModel, [
            {
                path: 'user',
                localField: 'user',
                foreignField: '_id',
                model: UserEntity.name,
                justOne: true,
            },
        ]);
    }
}
