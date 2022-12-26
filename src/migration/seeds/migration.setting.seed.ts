import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/common/setting/services/setting.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class MigrationSettingSeed {
    constructor(private readonly settingService: SettingService) {}

    @Command({
        command: 'seed:setting',
        describe: 'seeds settings',
    })
    async seeds(): Promise<void> {
        try {
            await this.settingService.create({
                name: 'maintenance',
                description: 'Maintenance Mode',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: 'false',
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:setting',
        describe: 'remove settings',
    })
    async remove(): Promise<void> {
        try {
            await this.settingService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
