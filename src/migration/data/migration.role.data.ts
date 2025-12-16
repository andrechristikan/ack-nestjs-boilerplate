import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { EnumRoleType } from '@prisma/client';

const roleData: RoleCreateRequestDto[] = [
    {
        name: 'superadmin',
        description: 'Super Admin Role',
        abilities: [],
        type: EnumRoleType.superAdmin,
    },
    {
        name: 'admin',
        description: 'Admin Role',
        abilities: Object.values(EnumPolicySubject).map(role => ({
            subject: role,
            action: Object.values(EnumPolicyAction),
        })),
        type: EnumRoleType.admin,
    },
    {
        name: 'user',
        description: 'User Role',
        abilities: [],
        type: EnumRoleType.user,
    },
];

export const migrationRoleData: Record<
    EnumAppEnvironment,
    RoleCreateRequestDto[]
> = {
    [EnumAppEnvironment.local]: roleData,
    [EnumAppEnvironment.development]: roleData,
    [EnumAppEnvironment.staging]: roleData,
    [EnumAppEnvironment.production]: roleData,
};
