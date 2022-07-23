import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionBulkService } from 'src/permission/service/permission.bulk.service';

@Injectable()
export class PermissionSeed {
    constructor(
        private readonly permissionBulkService: PermissionBulkService
    ) {}

    @Command({
        command: 'insert:permission',
        describe: 'insert permissions',
    })
    async insert(): Promise<void> {
        try {
            const permissions = Object.keys(ENUM_PERMISSIONS).map((val) => ({
                code: val,
                name: val.replace('_', ' '),
            }));

            await this.permissionBulkService.createMany(permissions);
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:permission',
        describe: 'remove permissions',
    })
    async remove(): Promise<void> {
        try {
            await this.permissionBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
