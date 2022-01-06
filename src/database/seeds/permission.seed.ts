import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';

@Injectable()
export class PermissionSeed {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly permissionService: PermissionService
    ) {}

    @Command({
        command: 'insert:permission',
        describe: 'insert permissions'
    })
    async insert(): Promise<void> {
        try {
            const permissions = Object.keys(ENUM_PERMISSIONS).map((val) => ({
                code: val,
                name: val.toLowerCase().replace('_', ' ')
            }));

            await this.permissionService.createMany(permissions);

            this.debuggerService.info('Insert Permission Succeed', {
                class: 'PermissionSeed',
                function: 'insert'
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'PermissionSeed',
                function: 'insert'
            });
        }
    }

    @Command({
        command: 'remove:permission',
        describe: 'remove permissions'
    })
    async remove(): Promise<void> {
        try {
            await this.permissionService.deleteMany({});

            this.debuggerService.info('Remove Permission Succeed', {
                class: 'PermissionSeed',
                function: 'remove'
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'PermissionSeed',
                function: 'remove'
            });
        }
    }
}
