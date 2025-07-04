import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleService } from '@modules/role/services/role.service';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';

@Injectable()
export class MigrationRoleSeed {
    constructor(private readonly roleService: RoleService) {}

    @Command({
        command: 'seed:role',
        describe: 'seed roles',
    })
    async seeds(): Promise<void> {
        const data: RoleCreateRequestDto[] = [
            {
                name: 'superadmin',
                type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
                permissions: [],
            },
            {
                name: 'admin',
                type: ENUM_POLICY_ROLE_TYPE.ADMIN,
                permissions: Object.values(ENUM_POLICY_SUBJECT)
                    .filter(e => e !== ENUM_POLICY_SUBJECT.API_KEY)
                    .map(val => ({
                        subject: val,
                        action: [ENUM_POLICY_ACTION.MANAGE],
                    })),
            },
            {
                name: 'individual',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
            },
            {
                name: 'premium',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
            },
            {
                name: 'business',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
            },
        ];

        try {
            await this.roleService.createMany(data);
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'remove:role',
        describe: 'remove roles',
    })
    async remove(): Promise<void> {
        try {
            await this.roleService.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
