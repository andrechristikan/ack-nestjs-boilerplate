import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingBulkService } from 'src/common/setting/services/setting.bulk.service';

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
                value: 'false',
            });

            await this.settingService.create({
                name: 'limitMaxPartNumber',
                description: 'Max Part Number Aws Chunk File',
                value: '10000',
            });
        } catch (err: any) {
            console.error(err);
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
