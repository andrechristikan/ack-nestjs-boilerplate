import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { PermissionService } from 'src/permission/permission.service';

@Injectable()
export class PermissionSeed {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly permissionService: PermissionService
    ) {}

    @Command({
        command: 'create:permission',
        describe: 'insert permissions',
        autoExit: true
    })
    async create(): Promise<void> {
        const check = await this.permissionService.findAll(0, 1);

        if (check && check.length !== 0) {
            this.logger.error('Only for initial purpose', {
                class: 'PermissionSeed',
                function: 'create'
            });

            return;
        }

        try {
            await this.permissionService.createMany([
                {
                    name: 'UserCreate'
                },
                {
                    name: 'UserUpdate'
                },
                {
                    name: 'UserRead'
                },
                {
                    name: 'UserDelete'
                },
                {
                    name: 'ProfileUpdate'
                },
                {
                    name: 'ProfileRead'
                },
                {
                    name: 'RoleCreate'
                },
                {
                    name: 'RoleUpdate'
                },
                {
                    name: 'RoleRead'
                },
                {
                    name: 'RoleDelete'
                },
                {
                    name: 'PermissionCreate'
                },
                {
                    name: 'PermissionUpdate'
                },
                {
                    name: 'PermissionRead'
                },
                {
                    name: 'PermissionDelete'
                }
            ]);

            this.logger.info('Insert Permission Succeed', {
                class: 'PermissionSeed',
                function: 'create'
            });
        } catch (e) {
            this.logger.error(e.message, {
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
            await this.permissionService.delete();

            this.logger.info('Insert Permission Succeed', {
                class: 'PermissionSeed',
                function: 'remove'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'PermissionSeed',
                function: 'remove'
            });
        }
    }
}
