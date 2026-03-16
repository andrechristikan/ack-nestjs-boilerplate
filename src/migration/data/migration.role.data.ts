import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import {
    PlatformRoleAdmin,
    PlatformRoleSuperAdmin,
    PlatformRoleUser,
} from '@modules/role/constants/role.constant';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { EnumRoleScope, EnumRoleType } from '@generated/prisma-client';

const roleData: RoleCreateRequestDto[] = [
    {
        name: PlatformRoleSuperAdmin,
        description: 'Super Admin Role',
        abilities: [],
        type: EnumRoleType.superAdmin,
        scope: EnumRoleScope.platform,
    },
    {
        name: PlatformRoleAdmin,
        description: 'Admin Role',
        abilities: Object.values(EnumPolicySubject).map(role => ({
            subject: role,
            action: Object.values(EnumPolicyAction),
        })),
        type: EnumRoleType.admin,
        scope: EnumRoleScope.platform,
    },
    {
        name: PlatformRoleUser,
        description: 'User Role',
        abilities: [],
        type: EnumRoleType.user,
        scope: EnumRoleScope.platform,
    }
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
