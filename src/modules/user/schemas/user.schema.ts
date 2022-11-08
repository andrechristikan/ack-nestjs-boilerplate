import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabaseHookBeforeSave,
    DatabaseSchema,
    DatabasePropPrimary,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';

@DatabaseEntity()
export class UserEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: String,
    })
    firstName: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: String,
    })
    lastName: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    mobileNumber: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    email: string;

    @DatabasePropForeign({
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
        type: String,
    })
    passwordExpired: Date;

    @DatabaseProp({
        required: true,
        type: String,
    })
    salt: string;

    @DatabaseProp({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseProp({
        required: false,
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

    @DatabaseHookBeforeSave()
    hookBeforeSave?() {
        this.email = this.email.toLowerCase().trim();
        this.firstName = this.firstName.toLowerCase().trim();
        this.lastName = this.lastName.toLowerCase().trim();
        this.mobileNumber = this.mobileNumber.trim();
    }
}

export const UserDatabaseName = 'users';

export const UserSchema = DatabaseSchema(UserEntity);
export type User = IDatabaseSchema<UserEntity>;
