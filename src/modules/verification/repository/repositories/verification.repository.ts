import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from 'src/common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    VerificationDoc,
    VerificationEntity,
} from 'src/modules/verification/repository/entity/verification.entity';

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
