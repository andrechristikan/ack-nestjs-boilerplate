import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PermissionBulkService } from 'src/modules/permission/services/permission.bulk.service';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';

@Injectable()
export class PermissionSeed {
    constructor(
        private readonly permissionBulkService: PermissionBulkService
    ) {}

    @Command({
        command: 'seed:permission',
        describe: 'seed permissions',
    })
    async seeds(): Promise<void> {
        try {
            const permissions: PermissionCreateDto[] = Object.keys(
                ENUM_AUTH_PERMISSIONS
            ).map((val) => ({
                code: val,
                name: val.replace('_', ' '),
                description: `${val.replace('_', ' ')} description`,
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
