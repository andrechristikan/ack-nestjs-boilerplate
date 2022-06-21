import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionService } from 'src/permission/service/permission.service';
import { RoleBulkService } from 'src/role/service/role.bulk.service';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { PermissionDocument } from 'src/permission/schema/permission.schema';

@Injectable()
export class RoleSeed {
    constructor(
        private readonly debuggerService: DebuggerService,
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

            this.debuggerService.debug(RoleSeed.name, {
                description: 'Insert Role Succeed',
                class: 'RoleSeed',
                function: 'insert',
            });
        } catch (e) {
            this.debuggerService.error(RoleSeed.name, {
                description: e.message,
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

            this.debuggerService.debug(RoleSeed.name, {
                description: 'Remove Role Succeed',
                class: 'RoleSeed',
                function: 'remove',
            });
        } catch (e) {
            this.debuggerService.error(RoleSeed.name, {
                description: e.message,
                class: 'RoleSeed',
                function: 'remove',
            });
        }
    }
}
