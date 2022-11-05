import { ApiKeyDatabaseName } from 'src/common/api-key/repository/entities/api-key.entity';
import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

@Entity({ name: ApiKeyDatabaseName })
export class ApiKeyPostgresEntity extends DatabasePostgresEntityAbstract {
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
        this.name = this.name.toLowerCase().trim();
        this.key = this.key.trim();
        this.hash = this.hash.trim();
        this.encryptionKey = this.encryptionKey.trim();
        this.passphrase = this.passphrase.trim();
    }
}
