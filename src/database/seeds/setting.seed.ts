import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { SettingService } from 'src/setting/service/setting.service';
import { SettingBulkService } from 'src/setting/service/setting.bulk.service';

@Injectable()
export class SettingSeed {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly settingService: SettingService,
        private readonly settingBulkService: SettingBulkService
    ) {}

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

            this.debuggerService.debug(SettingSeed.name, {
                description: 'Insert Setting Succeed',
                class: 'SettingSeed',
                function: 'insert',
            });
        } catch (e) {
            this.debuggerService.error(SettingSeed.name, {
                description: e.message,
                class: 'SettingSeed',
                function: 'insert',
            });
        }
    }

    @Command({
        command: 'remove:setting',
        describe: 'remove settings',
    })
    async remove(): Promise<void> {
        try {
            await this.settingBulkService.deleteMany({});

            this.debuggerService.debug(SettingSeed.name, {
                description: 'Remove Setting Succeed',
                class: 'SettingSeed',
                function: 'remove',
            });
        } catch (e) {
            this.debuggerService.error(SettingSeed.name, {
                description: e.message,
                class: 'SettingSeed',
                function: 'remove',
            });
        }
    }
}
