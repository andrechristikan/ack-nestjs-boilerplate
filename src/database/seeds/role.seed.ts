import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { RoleService } from 'src/role/role.service';
import { PermissionDocument } from 'src/permission/permission.interface';
import { RoleDocument } from 'src/role/role.interface';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';

@Injectable()
export class RoleSeed {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly permissionService: PermissionService,
        private readonly roleService: RoleService
    ) {}

    @Command({
        command: 'create:role',
        describe: 'insert roles',
        autoExit: true
    })
    async create(): Promise<void> {
        const permissions: PermissionDocument[] = await this.permissionService.findAll(
            {
                name: { $in: Object.keys(ENUM_PERMISSIONS) }
            },
            {
                limit: 20,
                skip: 0
            }
        );

        if (!permissions && permissions.length === 0) {
            this.debuggerService.error(
                'Go Insert Permissions Before Insert Roles',
                {
                    class: 'RoleSeed',
                    function: 'create'
                }
            );
            return;
        }

        const check: RoleDocument = await this.roleService.findOne<RoleDocument>();
        if (check) {
            this.debuggerService.error('Only for initial purpose', {
                class: 'RoleSeed',
                function: 'create'
            });
            return;
        }

        try {
            const permissionsMap = permissions.map((val) => val._id);
            await this.roleService.createMany([
                {
                    name: 'admin',
                    permissions: permissionsMap
                }
            ]);

            this.debuggerService.info('Insert Role Succeed', {
                class: 'RoleSeed',
                function: 'create'
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'RoleSeed',
                function: 'create'
            });
        }
    }

    @Command({
        command: 'remove:role',
        describe: 'remove roles',
        autoExit: true
    })
    async remove(): Promise<void> {
        try {
            await this.roleService.deleteMany({});

            this.debuggerService.info('Remove Role Succeed', {
                class: 'RoleSeed',
                function: 'remove'
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'RoleSeed',
                function: 'remove'
            });
        }
    }
}
