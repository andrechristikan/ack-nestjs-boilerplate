import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { ENUM_ROLE_TYPE } from '@prisma/client';

const roleData: RoleCreateRequestDto[] = [
    {
        name: 'superadmin',
        description: 'Super Admin Role',
        abilities: [],
        type: ENUM_ROLE_TYPE.superAdmin,
    },
    {
        name: 'admin',
        description: 'Admin Role',
        abilities: Object.values(ENUM_POLICY_SUBJECT).map(role => ({
            subject: role,
            action: Object.values(ENUM_POLICY_ACTION),
        })),
        type: ENUM_ROLE_TYPE.admin,
    },
    {
        name: 'user',
        description: 'User Role',
        abilities: [],
        type: ENUM_ROLE_TYPE.user,
    },
];

export const migrationRoleData: Record<
    ENUM_APP_ENVIRONMENT,
    RoleCreateRequestDto[]
> = {
    [ENUM_APP_ENVIRONMENT.local]: roleData,
    [ENUM_APP_ENVIRONMENT.development]: roleData,
    [ENUM_APP_ENVIRONMENT.staging]: roleData,
    [ENUM_APP_ENVIRONMENT.production]: roleData,
};
