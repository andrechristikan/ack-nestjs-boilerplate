import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { Permission } from 'src/modules/permission/schemas/permission.schema';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { RoleBulkService } from 'src/modules/role/services/role.bulk.service';
import { RoleService } from 'src/modules/role/services/role.service';

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
        const permissions: Permission[] = await this.permissionService.findAll({
            code: { $in: Object.values(ENUM_AUTH_PERMISSIONS) },
        });

        try {
            const permissionsMap = permissions.map((val) => val._id);
            await this.roleService.createSuperAdmin();
            await this.roleBulkService.createMany([
                {
                    name: 'admin',
                    permissions: permissionsMap,
                    accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
                },
                {
                    name: 'user',
                    permissions: [],
                    accessFor: ENUM_AUTH_ACCESS_FOR.USER,
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
