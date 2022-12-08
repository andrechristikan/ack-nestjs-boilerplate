import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingBulkService } from 'src/common/setting/services/setting.bulk.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingUseCase } from 'src/common/setting/use-cases/setting.use-case';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class MigrationSettingSeed {
    constructor(
        private readonly settingService: SettingService,
        private readonly settingUseCase: SettingUseCase,
        private readonly settingBulkService: SettingBulkService
    ) {}

    @Command({
        command: 'seed:setting',
        describe: 'seeds settings',
    })
    async seeds(): Promise<void> {
        try {
            const settingMaintenanceCreate: SettingEntity =
                await this.settingUseCase.create({
                    name: 'maintenance',
                    description: 'Maintenance Mode',
                    type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                    value: 'false',
                });
            const settingMaxPasswordAttemptCreate: SettingEntity =
                await this.settingUseCase.create({
                    name: 'maxPasswordAttempt',
                    description: 'Max password Attempt when user login',
                    type: ENUM_SETTING_DATA_TYPE.NUMBER,
                    value: '3',
                });
            const settingPasswordAttemptCreate: SettingEntity =
                await this.settingUseCase.create({
                    name: 'passwordAttempt',
                    description: 'Max password Attempt mode',
                    type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                    value: 'true',
                });
            const settingMobileNumberCountryCodeAllowedCreate: SettingEntity =
                await this.settingUseCase.create({
                    name: 'mobileNumberCountryCodeAllowed',
                    description: 'Max password Attempt mode',
                    type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                    value: '628,658',
                });

            const settingMaintenance: Promise<SettingEntity> =
                this.settingService.create(settingMaintenanceCreate);
            const settingMaxPasswordAttempt: Promise<SettingEntity> =
                this.settingService.create(settingMaxPasswordAttemptCreate);
            const settingPasswordAttempt: Promise<SettingEntity> =
                this.settingService.create(settingPasswordAttemptCreate);
            const settingMobileNumberCountryCodeAllowed: Promise<SettingEntity> =
                this.settingService.create(
                    settingMobileNumberCountryCodeAllowedCreate
                );

            await Promise.all([
                settingMaintenance,
                settingMaxPasswordAttempt,
                settingPasswordAttempt,
                settingMobileNumberCountryCodeAllowed,
            ]);
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
