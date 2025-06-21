import { Injectable } from '@nestjs/common';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { Model } from 'mongoose';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import {
    TermsPolicyAcceptanceDoc,
    TermsPolicyAcceptanceEntity,
} from '@modules/terms-policy/repository/entities/terms-policy.acceptance.entity';
import { TermsPolicyEntity } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';

@Injectable()
export class TermsPolicyAcceptanceRepository extends DatabaseUUIDRepositoryBase<
    TermsPolicyAcceptanceEntity,
    TermsPolicyAcceptanceDoc
> {
    constructor(
        @InjectDatabaseModel(TermsPolicyAcceptanceEntity.name)
        private readonly termsPolicyAcceptanceModel: Model<TermsPolicyAcceptanceEntity>
    ) {
        super(termsPolicyAcceptanceModel, [
            {
                path: 'user',
                localField: 'user',
                foreignField: '_id',
                model: UserEntity.name,
                justOne: true,
            },
            {
                path: 'policy',
                localField: 'policy',
                foreignField: '_id',
                model: TermsPolicyEntity.name,
                justOne: true,
            },
        ]);
    }
}
