import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { RoleService } from 'src/role/role.service';

@Injectable()
export class RoleSeed {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly permissionService: PermissionService,
        private readonly roleService: RoleService
    ) {}

    @Command({
        command: 'create:role',
        describe: 'insert roles',
        autoExit: true
    })
    async create(): Promise<void> {
        let permissions = await this.permissionService.findAll(0, 20, {
            name: {
                $in: [
                    'UserCreate',
                    'UserUpdate',
                    'UserRead',
                    'UserDelete',
                    'ProfileUpdate',
                    'ProfileRead',
                    'RoleCreate',
                    'RoleUpdate',
                    'RoleRead',
                    'RoleDelete',
                    'PermissionCreate',
                    'PermissionUpdate',
                    'PermissionRead',
                    'PermissionDelete'
                ]
            }
        });

        if (!permissions || permissions.length === 0) {
            this.logger.error('Go Insert Permissions Before Insert Roles', {
                class: 'RoleSeed',
                function: 'create'
            });

            return;
        }

        const check = await this.roleService.findAll(0, 1);
        if (check && check.length !== 0) {
            this.logger.error('Only for initial purpose', {
                class: 'RoleSeed',
                function: 'create'
            });

            return;
        }

        const userPermTemp = ['ProfileUpdate', 'ProfileRead'];
        const userPermission = permissions.filter(
            (val) => userPermTemp.indexOf(val.name) !== -1
        );
        permissions = permissions.map((val) => val._id);
        const adminPermission = permissions;

        try {
            await this.roleService.createMany([
                {
                    name: 'admin',
                    permissions: adminPermission
                }
            ]);

            await this.roleService.createMany([
                {
                    name: 'user',
                    permissions: userPermission
                }
            ]);

            this.logger.info('Insert Role Succeed', {
                class: 'RoleSeed',
                function: 'create'
            });
        } catch (e) {
            this.logger.error(e.message, {
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
            await this.roleService.delete();

            this.logger.info('Insert Role Succeed', {
                class: 'RoleSeed',
                function: 'remove'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'RoleSeed',
                function: 'remove'
            });
        }
    }
}
