import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { SettingService } from 'src/setting/service/setting.service';

@Injectable()
export class SettingSeed {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly settingService: SettingService
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

            this.debuggerService.debug(
                'Insert Setting Succeed',
                'SettingSeed',
                'insert'
            );
        } catch (e) {
            this.debuggerService.error(e.message, 'SettingSeed', 'insert');
        }
    }

    @Command({
        command: 'remove:setting',
        describe: 'remove settings',
    })
    async remove(): Promise<void> {
        try {
            await this.settingService.deleteOne({
                name: 'maintenance',
            });

            this.debuggerService.debug(
                'Remove Setting Succeed',
                'SettingSeed',
                'remove'
            );
        } catch (e) {
            this.debuggerService.error(e.message, 'SettingSeed', 'remove');
        }
    }
}
