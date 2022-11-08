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
        length: 10,
    })
    code: string;

    @Column({
        nullable: false,
        type: String,
        length: 100,
    })
    name: string;

    @Column({
        nullable: true,
        type: String,
        length: 255,
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
