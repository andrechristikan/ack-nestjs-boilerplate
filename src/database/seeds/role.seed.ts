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
                    'PermissionDelete',
                    'ProductCreate',
                    'ProductUpdate',
                    'ProductRead',
                    'ProductDelete'
                ]
            }
        });

        if (!permissions || permissions.length === 0) {
            this.logger.error('Go Insert Role Before Insert Roles', {
                class: 'RoleSeed',
                function: 'create'
            });

            return;
        }

        const check = await this.roleService.findAll(0, 1, {
            name: 'admin'
        });
        if (check && check.length !== 0) {
            this.logger.error('Only for initial purpose', {
                class: 'RoleSeed',
                function: 'create'
            });

            return;
        }

        permissions = permissions.map((val) => val._id);
        try {
            await this.roleService.createMany([
                {
                    name: 'admin',
                    permissions: permissions
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
            await this.roleService.deleteMany({
                name: 'admin'
            });

            this.logger.info('Remove Role Succeed', {
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
