import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import {
    AwsS3Entity,
    AwsS3Schema,
} from '@modules/aws/repository/entities/aws.s3.entity';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import {
    ENUM_USER_GENDER,
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

export const UserTableName = 'Users';

@DatabaseEntity({ collection: UserTableName })
export class UserEntity extends DatabaseUUIDEntityBase {
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
        ref: RoleEntity.name,
        index: true,
        trim: true,
    })
    role: string;

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
    photo?: AwsS3Entity;

    @DatabaseProp({
        required: false,
        type: String,
        enum: ENUM_USER_GENDER,
    })
    gender?: ENUM_USER_GENDER;

    @DatabaseProp({
        required: true,
        type: String,
        ref: CountryEntity.name,
        trim: true,
    })
    country: string;
}

export const UserSchema = DatabaseSchema(UserEntity);
export type UserDoc = IDatabaseDocument<UserEntity>;
