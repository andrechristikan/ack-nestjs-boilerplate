import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
import { DatabasePostgresSchema } from 'src/common/database/decorators/database.decorator';
import { PermissionDatabaseName } from 'src/modules/permission/repository/entities/permission.entity';
import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

@DatabasePostgresSchema({ name: PermissionDatabaseName })
export class PermissionPostgresEntity extends DatabasePostgresEntityAbstract {
    @Column({
        nullable: false,
        unique: true,
        type: String,
    })
    code: string;

    @Column({
        nullable: false,
        type: String,
    })
    name: string;

    @Column({
        nullable: true,
        type: String,
    })
    description: string;

    @Column({
        nullable: false,
        default: true,
        type: Boolean,
    })
    isActive: boolean;

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave() {
        this.code = this.code.toUpperCase().trim();
        this.name = this.name.toLowerCase().trim();
    }
}
