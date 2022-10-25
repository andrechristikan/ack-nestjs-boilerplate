import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabaseHookBefore,
    DatabaseSchema,
    DatabasePropPrimary,
} from 'src/common/database/decorators/database.decorator';
import {
    DatabaseKeyType,
    DatabaseSchemaType,
} from 'src/common/database/interfaces/database.interface';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class UserEntity {
    @DatabasePropPrimary()
    _id?: DatabaseKeyType;

    @DatabaseProp({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
    })
    firstName: string;

    @DatabaseProp({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
    })
    lastName: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        trim: true,
    })
    mobileNumber: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true,
    })
    email: string;

    @DatabasePropForeign({
        required: true,
        ref: RoleEntity.name,
        index: true,
    })
    role: DatabaseKeyType;

    @DatabaseProp({
        required: true,
    })
    password: string;

    @DatabaseProp({
        required: true,
        index: true,
    })
    passwordExpired: Date;

    @DatabaseProp({
        required: true,
    })
    salt: string;

    @DatabaseProp({
        required: true,
        default: true,
        index: true,
    })
    isActive: boolean;

    @DatabaseProp({
        required: false,
        _id: false,
        type: {
            path: String,
            pathWithFilename: String,
            filename: String,
            completedUrl: String,
            baseUrl: String,
            mime: String,
        },
    })
    photo?: AwsS3Serialization;

    @DatabaseHookBefore()
    hookBefore() {
        this.email = this.email.toLowerCase();
        this.firstName = this.firstName.toLowerCase();
        this.lastName = this.lastName.toLowerCase();
    }
}

export const UserDatabaseName = 'users';

export const User = DatabaseSchema(UserEntity);
export type User = DatabaseSchemaType<UserEntity>;
