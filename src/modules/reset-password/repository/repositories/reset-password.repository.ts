import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from 'src/common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ResetPasswordDoc,
    ResetPasswordEntity,
} from 'src/modules/reset-password/repository/entities/reset-password.entity';

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
