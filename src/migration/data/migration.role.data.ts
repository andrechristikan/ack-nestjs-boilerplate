import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { EnumRoleScope, EnumRoleType } from '@prisma/client';

const roleData: RoleCreateRequestDto[] = [
    {
        name: 'superadmin',
        description: 'Super Admin Role',
        abilities: [],
        type: EnumRoleType.superAdmin,
        scope: EnumRoleScope.platform,
    },
    {
        name: 'admin',
        description: 'Admin Role',
        abilities: Object.values(EnumPolicySubject).map(role => ({
            subject: role,
            action: Object.values(EnumPolicyAction),
        })),
        type: EnumRoleType.admin,
        scope: EnumRoleScope.platform,
    },
    {
        name: 'user',
        description: 'User Role',
        abilities: [],
        type: EnumRoleType.user,
        scope: EnumRoleScope.platform,
    },
    {
        name: 'platform-admin',
        description:
            'Platform administrator. Can onboard new tenants and manage tenant lifecycle.',
        abilities: [
            {
                subject: EnumPolicySubject.tenant,
                action: [
                    EnumPolicyAction.create,
                    EnumPolicyAction.read,
                    EnumPolicyAction.update,
                    EnumPolicyAction.delete,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.platform,
    },
    {
        name: 'tenant-admin',
        description:
            'Tenant administrator. Can manage tenant settings and members.',
        abilities: [
            {
                subject: EnumPolicySubject.tenant,
                action: [
                    EnumPolicyAction.read,
                    EnumPolicyAction.update,
                ],
            },
            {
                subject: EnumPolicySubject.tenantMember,
                action: [
                    EnumPolicyAction.read,
                    EnumPolicyAction.create,
                    EnumPolicyAction.update,
                    EnumPolicyAction.delete,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
    },
    {
        name: 'tenant-user',
        description:
            'Tenant member. Can access and view tenant resources with limited permissions.',
        abilities: [
            {
                subject: EnumPolicySubject.tenant,
                action: [EnumPolicyAction.read],
            },
            {
                subject: EnumPolicySubject.tenantMember,
                action: [EnumPolicyAction.read],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
    },
    {
        name: 'tenant-platform-support',
        description:
            'Temporary support access for platform operators. Read-all tenant data + member management.',
        abilities: [
            {
                subject: EnumPolicySubject.tenant,
                action: [EnumPolicyAction.read],
            },
            {
                subject: EnumPolicySubject.tenantMember,
                action: [
                    EnumPolicyAction.read,
                    EnumPolicyAction.create,
                    EnumPolicyAction.update,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
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
