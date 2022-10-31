import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyDatabaseName } from 'src/common/api-key/schemas/api-key.schema';
import { ApiKeyBeforeSaveHook } from 'src/common/api-key/schemas/hooks/api-key.before-save.hook';
import { DatabasePostgresEntity } from 'src/common/database/schemas/database.postgres.schema';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

@Entity({ name: ApiKeyDatabaseName })
export class ApiKeyPostgresEntity
    extends DatabasePostgresEntity
    implements IApiKeyEntity
{
    @Column({
        nullable: false,
        type: String,
    })
    name: string;

    @Column({
        nullable: true,
        type: String,
    })
    description?: string;

    @Column({
        nullable: false,
        type: String,
        unique: true,
    })
    key: string;

    @Column({
        nullable: false,
        type: String,
    })
    hash: string;

    @Column({
        nullable: false,
        type: String,
    })
    encryptionKey: string;

    @Column({
        nullable: false,
        type: String,
        length: 16,
    })
    passphrase: string;

    @Column({
        nullable: false,
        type: Boolean,
    })
    isActive: boolean;

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave() {
        ApiKeyBeforeSaveHook();
    }
}

export const ApiKeyPostgresSchema = ApiKeyPostgresEntity;
