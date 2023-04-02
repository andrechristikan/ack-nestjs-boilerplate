import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';

@Injectable()
export class MigrationRoleSeed {
    constructor(private readonly roleService: RoleService) {}

    @Command({
        command: 'seed:role',
        describe: 'seed roles',
    })
    async seeds(): Promise<void> {
        const dataAdmin: RoleCreateDto[] = [
            {
                name: 'superadmin',
                type: ENUM_AUTH_TYPE.SUPER_ADMIN,
            },
            {
                name: 'admin',
                type: ENUM_AUTH_TYPE.ADMIN,
            },
            {
                name: 'user',
                type: ENUM_AUTH_TYPE.USER,
            },
        ];

        try {
            await this.roleService.createMany(dataAdmin);
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
            await this.roleService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
