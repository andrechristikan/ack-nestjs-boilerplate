import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_VERIFICATION_TYPE } from 'src/modules/verification/enums/verification.enum.constant';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export const VerificationTableName = 'verifications';

@DatabaseEntity({ collection: VerificationTableName })
export class VerificationEntity extends DatabaseEntityBase {
    @Prop({
        required: true,
        ref: UserEntity.name,
        index: true,
        type: String,
    })
    user: string;

    @Prop({
        required: true,
        type: String,
    })
    to: string;

    @Prop({
        required: true,
        enum: ENUM_VERIFICATION_TYPE,
        index: true,
        type: String,
    })
    type: ENUM_VERIFICATION_TYPE;

    @Prop({
        required: true,
        trim: true,
    })
    otp: string;

    @Prop({
        required: true,
        type: Date,
    })
    expiredDate: Date;

    @Prop({
        required: false,
        type: Date,
    })
    verifyDate?: Date;

    @Prop({
        required: true,
        index: true,
        default: true,
    })
    isActive: boolean;

    @Prop({
        required: true,
        index: true,
        default: false,
    })
    isVerify: boolean;

    @Prop({
        required: true,
    })
    reference: string;
}

export const VerificationSchema =
    SchemaFactory.createForClass(VerificationEntity);
export type VerificationDoc = IDatabaseDocument<VerificationEntity>;
