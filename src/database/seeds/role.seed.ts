import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionService } from 'src/permission/service/permission.service';
import { RoleBulkService } from 'src/role/service/role.bulk.service';
import { PermissionDocument } from 'src/permission/schema/permission.schema';
import { ErrorMeta } from 'src/utils/error/error.decorator';
import { ENUM_ROLE_ACCESS_FOR } from 'src/role/role.constant';

@Injectable()
export class RoleSeed {
    constructor(
        private readonly permissionService: PermissionService,
        private readonly roleBulkService: RoleBulkService
    ) {}

    @ErrorMeta(RoleSeed.name, 'insert')
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
                    accessFor: [ENUM_ROLE_ACCESS_FOR.ADMIN],
                },
                {
                    name: 'user',
                    permissions: [],
                    accessFor: [ENUM_ROLE_ACCESS_FOR.USER],
                },
            ]);
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }

    @ErrorMeta(RoleSeed.name, 'remove')
    @Command({
        command: 'remove:role',
        describe: 'remove roles',
    })
    async remove(): Promise<void> {
        try {
            await this.roleBulkService.deleteMany({});
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }
}
