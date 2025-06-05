import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    VerificationDoc,
    VerificationEntity,
} from '@modules/verification/repository/entity/verification.entity';

@Injectable()
export class VerificationRepository extends DatabaseUUIDRepositoryBase<
    VerificationEntity,
    VerificationDoc
> {
    constructor(
        @InjectDatabaseModel(VerificationEntity.name)
        private readonly verificationModel: Model<VerificationEntity>
    ) {
        super(verificationModel);
    }
}
