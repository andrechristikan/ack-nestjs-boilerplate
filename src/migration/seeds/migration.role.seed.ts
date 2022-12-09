import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { RoleBulkService } from 'src/modules/role/services/role.bulk.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';

@Injectable()
export class RoleSeed {
    constructor(
        private readonly permissionService: PermissionService,
        private readonly roleBulkService: RoleBulkService,
        private readonly roleService: RoleService,
        private readonly roleUseCase: RoleUseCase
    ) {}

    @Command({
        command: 'seed:role',
        describe: 'seed roles',
    })
    async seeds(): Promise<void> {
        const permissions: PermissionEntity[] =
            await this.permissionService.findAll();
        const permissionsMap = permissions.map((val) => val._id);

        const dataAdmin: RoleCreateDto[] = [
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
        ];

        const mapAdmin: Promise<RoleEntity>[] = dataAdmin.map((val) =>
            this.roleUseCase.create(val)
        );

        const dataSuperAdmin: RoleEntity =
            await this.roleUseCase.createSuperAdmin();

        try {
            await this.roleService.create(dataSuperAdmin);

            const createAdmin: RoleEntity[] = await Promise.all(mapAdmin);
            await this.roleBulkService.createMany(createAdmin);
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
