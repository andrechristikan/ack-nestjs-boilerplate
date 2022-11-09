import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
import { DatabasePostgresSchema } from 'src/common/database/decorators/database.decorator';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionPostgresEntity } from 'src/modules/permission/repository/entities/permission.postgres.entity';
import { RoleDatabaseName } from 'src/modules/role/repository/entities/role.entity';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    JoinColumn,
    JoinTable,
    ManyToMany,
} from 'typeorm';

@DatabasePostgresSchema({ name: RoleDatabaseName })
export class RolePostgresEntity extends DatabasePostgresEntityAbstract {
    @Column({
        nullable: false,
        unique: true,
        type: String,
        length: 100,
    })
    name: string;

    @ManyToMany(() => PermissionPostgresEntity, {
        cascade: true,
        eager: false,
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinTable({
        name: 'role_permissions',
        joinColumn: {
            name: 'role',
            referencedColumnName: '_id',
        },
        inverseJoinColumn: {
            name: 'permission',
            referencedColumnName: '_id',
        },
    })
    @Column({
        nullable: false,
        default: [],
        type: 'uuid',
        array: true,
    })
    permissions: string[];

    @Column({
        nullable: false,
        default: true,
        type: Boolean,
    })
    isActive: boolean;

    @Column({
        nullable: false,
        enum: ENUM_AUTH_ACCESS_FOR,
        type: String,
    })
    accessFor: ENUM_AUTH_ACCESS_FOR;

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave() {
        this.name = this.name.toLowerCase().trim();
    }
}
