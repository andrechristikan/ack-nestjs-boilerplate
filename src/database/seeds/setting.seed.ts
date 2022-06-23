import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/setting/service/setting.service';
import { SettingBulkService } from 'src/setting/service/setting.bulk.service';
import { ErrorMeta } from 'src/utils/error/error.decorator';

@Injectable()
export class SettingSeed {
    constructor(
        private readonly settingService: SettingService,
        private readonly settingBulkService: SettingBulkService
    ) {}

    @ErrorMeta(SettingSeed.name, 'insert')
    @Command({
        command: 'insert:setting',
        describe: 'insert settings',
    })
    async insert(): Promise<void> {
        try {
            await this.settingService.create({
                name: 'maintenance',
                description: 'Maintenance Mode',
                value: 'false',
            });
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }

    @ErrorMeta(SettingSeed.name, 'remove')
    @Command({
        command: 'remove:setting',
        describe: 'remove settings',
    })
    async remove(): Promise<void> {
        try {
            await this.settingBulkService.deleteMany({});
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }
}
