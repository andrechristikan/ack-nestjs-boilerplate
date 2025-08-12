import {
    AwsS3Entity,
    AwsS3Schema,
} from '@common/aws/repository/entities/aws.s3.entity';
import { DatabaseEntityBase } from '@common/database/bases/database.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from '@modules/user/enums/user.enum';
import {
    UserMobileNumberEntity,
    UserMobileNumberSchema,
} from '@modules/user/repository/entities/user.mobile-number.entity';
import {
    UserTermPolicyEntity,
    UserTermPolicySchema,
} from '@modules/user/repository/entities/user.term-policy.entity';
import {
    UserVerificationEntity,
    UserVerificationSchema,
} from '@modules/user/repository/entities/user.verification.entity';
import { Types } from 'mongoose';

export const UserTableName = 'Users';

@DatabaseEntity({ collection: UserTableName })
export class UserEntity extends DatabaseEntityBase {
    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 100,
    })
    name: string;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 50,
        minlength: 3,
        unique: true,
    })
    username: string;

    @DatabaseProp({
        required: false,
        schema: UserMobileNumberSchema,
    })
    mobileNumber?: UserMobileNumberEntity;

    @DatabaseProp({
        required: true,
        schema: UserVerificationSchema,
    })
    verification: UserVerificationEntity;

    @DatabaseProp({
        required: true,
        schema: UserTermPolicySchema,
    })
    termPolicy: UserTermPolicyEntity;

    @DatabaseProp({
        required: true,
        unique: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 100,
    })
    email: string;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: Types.ObjectId,
    })
    roleId: Types.ObjectId;

    @DatabaseProp({
        required: false,
        ref: RoleEntity.name,
    })
    role?: RoleEntity;

    @DatabaseProp({
        required: true,
        type: String,
        trim: true,
    })
    password: string;

    @DatabaseProp({
        required: true,
        type: Date,
    })
    passwordExpired: Date;

    @DatabaseProp({
        required: true,
        type: Date,
    })
    passwordCreated: Date;

    @DatabaseProp({
        required: true,
        default: 0,
        type: Number,
    })
    passwordAttempt: number;

    @DatabaseProp({
        required: true,
        type: Date,
        trim: true,
    })
    signUpDate: Date;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_USER_SIGN_UP_FROM,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @DatabaseProp({
        required: true,
        type: String,
    })
    salt: string;

    @DatabaseProp({
        required: true,
        default: ENUM_USER_STATUS.ACTIVE,
        index: true,
        type: String,
        enum: ENUM_USER_STATUS,
    })
    status: ENUM_USER_STATUS;

    @DatabaseProp({
        required: false,
        schema: AwsS3Schema,
    })
    profilePhoto?: AwsS3Entity;

    @DatabaseProp({
        required: true,
        type: Types.ObjectId,
        index: true,
        trim: true,
    })
    countryId: Types.ObjectId;

    @DatabaseProp({
        required: false,
        ref: CountryEntity.name,
    })
    country?: RoleEntity;
}

export const UserSchema = DatabaseSchema(UserEntity);
