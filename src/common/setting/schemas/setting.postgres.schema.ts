import { DatabasePostgresEntity } from 'src/common/database/schemas/database.postgres.schema';
import { ISettingEntity } from 'src/common/setting/interfaces/setting.interface';
import { SettingBeforeSaveHook } from 'src/common/setting/schemas/hooks/setting.before-hook.hook';
import { SettingDatabaseName } from 'src/common/setting/schemas/setting.schema';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

@Entity({ name: SettingDatabaseName })
export class SettingPostgresEntity
    extends DatabasePostgresEntity
    implements ISettingEntity
{
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
        SettingBeforeSaveHook();
    }
}

export const SettingPostgresSchema = SettingPostgresEntity;
