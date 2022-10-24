import {
    DatabaseHookBefore,
    DatabaseEntity,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    DatabasePrimaryKeyType,
    DatabaseSchemaType,
} from 'src/common/database/interfaces/database.interface';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class AuthApiEntity {
    @DatabasePropPrimary()
    _id?: DatabasePrimaryKeyType;

    @DatabaseProp({
        required: true,
        index: true,
    })
    name: string;

    @DatabaseProp({
        required: false,
    })
    description?: string;

    @DatabaseProp({
        required: true,
        trim: true,
        unique: true,
        index: true,
    })
    key: string;

    @DatabaseProp({
        required: true,
        trim: true,
    })
    hash: string;

    @DatabaseProp({
        required: true,
        trim: true,
        index: true,
    })
    encryptionKey: string;

    @DatabaseProp({
        required: true,
        trim: true,
        minLength: 16,
        maxLength: 16,
    })
    passphrase: string;

    @DatabaseProp({
        required: true,
        index: true,
    })
    isActive: boolean;

    @DatabaseHookBefore()
    beforeHook() {
        this.name = this.name.toLowerCase();
    }
}

export const AuthApiDatabaseName = 'authapis';

export const AuthApi = DatabaseSchema(AuthApiEntity);
export type AuthApi = DatabaseSchemaType<AuthApiEntity>;
