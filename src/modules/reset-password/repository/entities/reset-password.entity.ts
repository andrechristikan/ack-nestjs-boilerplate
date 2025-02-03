import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_RESET_PASSWORD_TYPE } from 'src/modules/reset-password/enums/reset-password.enum';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export const ResetPasswordTableName = 'ResetPasswords';

@DatabaseEntity({ collection: ResetPasswordTableName })
export class ResetPasswordEntity extends DatabaseEntityBase {
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
        trim: true,
        minlength: 6,
        maxlength: 6,
    })
    otp: string;

    @Prop({
        required: true,
        trim: true,
        unique: true,
        index: true,
        minlength: 20,
        maxlength: 20,
    })
    token: string;

    @Prop({
        required: true,
        index: true,
        enum: ENUM_RESET_PASSWORD_TYPE,
        type: String,
    })
    type: ENUM_RESET_PASSWORD_TYPE;

    @Prop({
        required: true,
        type: Date,
    })
    expiredDate: Date;

    @Prop({
        required: false,
        type: Date,
    })
    resetDate?: Date;

    @Prop({
        required: false,
        type: Date,
    })
    verifyDate?: Date;

    @Prop({
        required: true,
        index: true,
        default: false,
    })
    isReset: boolean;

    @Prop({
        required: true,
        index: true,
        default: false,
    })
    isActive: boolean;

    @Prop({
        required: true,
        index: true,
    })
    reference: string;
}

export const ResetPasswordSchema =
    SchemaFactory.createForClass(ResetPasswordEntity);
export type ResetPasswordDoc = IDatabaseDocument<ResetPasswordEntity>;
