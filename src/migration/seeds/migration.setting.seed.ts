import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingBulkService } from 'src/common/setting/services/setting.bulk.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';

@Injectable()
export class MigrationSettingSeed {
    constructor(
        private readonly settingService: SettingService,
        private readonly settingBulkService: SettingBulkService
    ) {}

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

            await this.settingService.create({
                name: 'maxPasswordAttempt',
                description: 'Max password Attempt when user login',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '3',
            });

            await this.settingService.create({
                name: 'passwordAttempt',
                description: 'Max password Attempt mode',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: 'true',
            });

            await this.settingService.create({
                name: 'mobileNumberCountryCodeAllowed',
                description: 'Max password Attempt mode',
                type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                value: '628,658',
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
            await this.settingBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
