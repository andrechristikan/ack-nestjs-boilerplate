import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
import { DatabasePostgresSchema } from 'src/common/database/decorators/database.decorator';
import { SettingDatabaseName } from 'src/common/setting/repository/entities/setting.entity';
import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

@DatabasePostgresSchema({ name: SettingDatabaseName })
export class SettingPostgresEntity extends DatabasePostgresEntityAbstract {
    @Column({
        nullable: false,
        unique: true,
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
    })
    value: string;

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave() {
        this.name = this.name.trim();
        this.value = this.value.trim();
    }
}
