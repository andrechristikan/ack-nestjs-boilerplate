import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    ResetPasswordDoc,
    ResetPasswordEntity,
} from '@module/reset-password/repository/entities/reset-password.entity';

@Injectable()
export class ResetPasswordRepository extends DatabaseUUIDRepositoryBase<
    ResetPasswordEntity,
    ResetPasswordDoc
> {
    constructor(
        @InjectDatabaseModel(ResetPasswordEntity.name)
        private readonly resetPasswordModel: Model<ResetPasswordEntity>
    ) {
        super(resetPasswordModel);
    }
}
