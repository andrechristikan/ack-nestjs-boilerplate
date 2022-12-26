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
        const setting1: Promise<SettingEntity> = this.settingService.create({
            name: 'maintenance',
            description: 'Maintenance Mode',
            type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            value: 'false',
        });

        const setting2: Promise<SettingEntity> = this.settingService.create({
            name: 'maxPasswordAttempt',
            description: 'Max password Attempt when user login',
            type: ENUM_SETTING_DATA_TYPE.NUMBER,
            value: '3',
        });

        const setting3: Promise<SettingEntity> = this.settingService.create({
            name: 'passwordAttempt',
            description: 'Max password Attempt mode',
            type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            value: 'true',
        });

        const setting4: Promise<SettingEntity> = this.settingService.create({
            name: 'mobileNumberCountryCodeAllowed',
            description: 'Max password Attempt mode',
            type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
            value: '628,658',
        });

        try {
            await Promise.all([setting1, setting2, setting3, setting4]);
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
