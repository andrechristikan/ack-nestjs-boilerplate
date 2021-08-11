import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { PermissionService } from 'src/permission/permission.service';
import { PERMISSION_LIST } from 'src/permission/permission.constant';
import { PermissionDocument } from 'src/permission/permission.interface';

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
        const check: PermissionDocument = await this.permissionService.findOne();
        if (check) {
            this.logger.error('Only for initial purpose', {
                class: 'PermissionSeed',
                function: 'create'
            });
            return;
        }

        try {
            const permissions = Object.keys(PERMISSION_LIST).map((val) => ({
                name: val
            }));
            await this.permissionService.createMany(permissions);

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
            await this.permissionService.deleteMany();

            this.logger.info('Remove Permission Succeed', {
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
