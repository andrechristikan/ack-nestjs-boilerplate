import {
    AwsS3Entity,
    AwsS3Schema,
} from 'src/common/aws/repository/entities/aws.s3.entity';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';

export const UserTableName = 'Users';

@DatabaseEntity({ collection: UserTableName })
export class UserEntity extends DatabaseMongoUUIDEntityAbstract {
    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    firstName: string;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    lastName: string;

    @DatabaseProp({
        required: false,
        trim: true,
        sparse: true,
        unique: true,
        type: String,
        maxlength: 20,
        minlength: 8,
    })
    mobileNumber?: string;

    @DatabaseProp({
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true,
        type: String,
        maxlength: 100,
    })
    email: string;

    @DatabaseProp({
        required: true,
        ref: RoleEntity.name,
        index: true,
    })
    role: string;

    @DatabaseProp({
        required: true,
        type: String,
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
    })
    signUpDate: Date;

    @DatabaseProp({
        required: true,
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
        required: true,
        default: false,
        index: true,
        type: Boolean,
    })
    blocked: boolean;

    @DatabaseProp({
        required: false,
        schema: AwsS3Schema,
    })
    photo?: AwsS3Entity;

    @DatabaseProp({
        required: false,
        maxlength: 200,
    })
    address?: string;

    @DatabaseProp({
        required: false,
        enum: ENUM_USER_GENDER,
    })
    gender?: ENUM_USER_GENDER;

    @DatabaseProp({
        required: false,
    })
    selfDeletion?: boolean;
}

export const UserSchema = DatabaseSchema(UserEntity);
export type UserDoc = IDatabaseDocument<UserEntity>;
