import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionDocument } from 'src/permission/permission.interface';

@Injectable()
export class PermissionSeed {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly permissionService: PermissionService
    ) {}

    @Command({
        command: 'create:permission',
        describe: 'insert permissions',
        autoExit: true
    })
    async create(): Promise<void> {
        const check: PermissionDocument = await this.permissionService.findOne();
        if (check) {
            this.debuggerService.error('Only for initial purpose', {
                class: 'PermissionSeed',
                function: 'create'
            });
            return;
        }

        try {
            const permissions = Object.keys(ENUM_PERMISSIONS).map((val) => ({
                name: val
            }));
            await this.permissionService.createMany(permissions);

            this.debuggerService.info('Insert Permission Succeed', {
                class: 'PermissionSeed',
                function: 'create'
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'PermissionSeed',
                function: 'create'
            });
        }
    }

    @Command({
        command: 'remove:permission',
        describe: 'remove permissions',
        autoExit: true
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
