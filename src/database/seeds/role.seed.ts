import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { RoleBulkService } from 'src/role/role.service';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionDocument } from 'src/permission/permission.schema';

@Injectable()
export class RoleSeed {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly permissionService: PermissionService,
        private readonly roleBulkService: RoleBulkService
    ) {}

    @Command({
        command: 'insert:role',
        describe: 'insert roles',
    })
    async insert(): Promise<void> {
        const permissions: PermissionDocument[] =
            await this.permissionService.findAll({
                code: { $in: Object.values(ENUM_PERMISSIONS) },
            });

        try {
            const permissionsMap = permissions.map((val) => val._id);
            await this.roleBulkService.createMany([
                {
                    name: 'admin',
                    permissions: permissionsMap,
                    isAdmin: true,
                },
                {
                    name: 'user',
                    permissions: [],
                    isAdmin: false,
                },
            ]);

            this.debuggerService.info('Insert Role Succeed', {
                class: 'RoleSeed',
                function: 'insert',
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'RoleSeed',
                function: 'insert',
            });
        }
    }

    @Command({
        command: 'remove:role',
        describe: 'remove roles',
    })
    async remove(): Promise<void> {
        try {
            await this.roleBulkService.deleteMany({});

            this.debuggerService.info('Remove Role Succeed', {
                class: 'RoleSeed',
                function: 'remove',
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'RoleSeed',
                function: 'remove',
            });
        }
    }
}
