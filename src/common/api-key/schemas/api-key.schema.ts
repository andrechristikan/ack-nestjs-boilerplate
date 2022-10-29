import {
    DatabaseEntity,
    DatabaseHookBeforeSave,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';

@DatabaseEntity()
export class ApiKeyEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: String,
    })
    name: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    description?: string;

    @DatabaseProp({
        required: true,
        type: String,
        unique: true,
        index: true,
    })
    key: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    hash: string;

    @DatabaseProp({
        required: true,
        type: String,
        index: true,
    })
    encryptionKey: string;

    @DatabaseProp({
        required: true,
        type: String,
        minLength: 16,
        maxLength: 16,
    })
    passphrase: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseHookBeforeSave()
    hookBeforeSave?() {
        this.name = this.name.toLowerCase().trim();
        this.key = this.key.trim();
        this.hash = this.hash.trim();
        this.encryptionKey = this.encryptionKey.trim();
        this.passphrase = this.passphrase.trim();
    }
}

export const ApiKeyDatabaseName = 'apikeys';

export const ApiKeySchema = DatabaseSchema(ApiKeyEntity);
export type ApiKey = IDatabaseSchema<ApiKeyEntity>;
