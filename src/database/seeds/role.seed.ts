import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PermissionService } from 'src/permission/service/permission.service';
import { RoleBulkService } from 'src/role/service/role.bulk.service';
import { PermissionDocument } from 'src/permission/schema/permission.schema';
import { ENUM_ROLE_ACCESS_FOR } from 'src/role/role.constant';
import { RoleService } from 'src/role/service/role.service';

@Injectable()
export class RoleSeed {
    constructor(
        private readonly permissionService: PermissionService,
        private readonly roleBulkService: RoleBulkService,
        private readonly roleService: RoleService
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
            await this.roleService.createSuperAdmin();
            await this.roleBulkService.createMany([
                {
                    name: 'admin',
                    permissions: permissionsMap,
                    accessFor: ENUM_ROLE_ACCESS_FOR.ADMIN,
                },
                {
                    name: 'user',
                    permissions: [],
                    accessFor: ENUM_ROLE_ACCESS_FOR.USER,
                },
            ]);
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:role',
        describe: 'remove roles',
    })
    async remove(): Promise<void> {
        try {
            await this.roleBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
