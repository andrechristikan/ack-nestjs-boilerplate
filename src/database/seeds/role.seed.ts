import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { RoleService } from 'src/role/role.service';
import { PermissionDocument } from 'src/permission/permission.interface';
import { RoleDocument } from 'src/role/role.interface';
import { PermissionList } from 'src/permission/permission.constant';

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
        let permissions: PermissionDocument[] = await this.permissionService.findAll(
            {
                name: { $in: Object.keys(PermissionList) }
            },
            {
                limit: 20,
                offset: 0
            }
        );

        if (!permissions && permissions.length === 0) {
            this.logger.error('Go Insert Permissions Before Insert Roles', {
                class: 'RoleSeed',
                function: 'create'
            });
            return;
        }

        const check: RoleDocument = await this.roleService.findOne<RoleDocument>();
        if (check) {
            this.logger.error('Only for initial purpose', {
                class: 'RoleSeed',
                function: 'create'
            });
            return;
        }

        try {
            permissions = permissions.map((val) => val._id);
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
            await this.roleService.deleteMany();

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
