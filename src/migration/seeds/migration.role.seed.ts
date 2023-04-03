import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

@Injectable()
export class MigrationRoleSeed {
    constructor(private readonly roleService: RoleService) {}

    @Command({
        command: 'seed:role',
        describe: 'seed roles',
    })
    async seeds(): Promise<void> {
        // todo
        // mapping permission
        const dataAdmin: RoleCreateDto[] = [
            {
                name: 'superadmin',
                type: ENUM_AUTH_TYPE.SUPER_ADMIN,
                permissions: [],
            },
            {
                name: 'admin',
                type: ENUM_AUTH_TYPE.ADMIN,
                permissions: Object.values(ENUM_POLICY_SUBJECT).map((val) => ({
                    subject: val,
                    action: [ENUM_POLICY_ACTION.MANAGE],
                })),
            },
            {
                name: 'member',
                type: ENUM_AUTH_TYPE.USER,
                permissions: [
                    {
                        subject: ENUM_POLICY_SUBJECT.API_KEY,
                        action: Object.values(ENUM_POLICY_ACTION).filter(
                            (val) => val !== ENUM_POLICY_ACTION.MANAGE
                        ),
                    },
                    {
                        subject: ENUM_POLICY_SUBJECT.USER,
                        action: Object.values(ENUM_POLICY_ACTION).filter(
                            (val) => val !== ENUM_POLICY_ACTION.MANAGE
                        ),
                    },
                ],
            },
            {
                name: 'user',
                type: ENUM_AUTH_TYPE.USER,
                permissions: [
                    {
                        subject: ENUM_POLICY_SUBJECT.USER,
                        action: Object.values(ENUM_POLICY_ACTION).filter(
                            (val) => val !== ENUM_POLICY_ACTION.MANAGE
                        ),
                    },
                ],
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
