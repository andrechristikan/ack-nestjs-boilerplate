import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/modules/setting/services/setting.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/constants/setting.enum.constant';

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
                name: 'mobileNumberAllowed',
                type: ENUM_SETTING_DATA_TYPE.JSON,
                value: '["62","65"]',
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
