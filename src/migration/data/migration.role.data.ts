import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import {
    ProjectRoleAdmin,
    ProjectRoleEditor,
    ProjectRoleViewer,
} from '@modules/project/constants/project.constant';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import {
    TenantRoleAdmin,
    TenantRolePlatformSupport,
    TenantRoleUser,
} from '@modules/tenant/constants/tenant.constant';
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
        name: TenantRoleAdmin,
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
            {
                subject: EnumPolicySubject.project,
                action: [
                    EnumPolicyAction.create,
                    EnumPolicyAction.read,
                    EnumPolicyAction.update,
                    EnumPolicyAction.delete,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
    },
    {
        name: TenantRoleUser,
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
            {
                subject: EnumPolicySubject.project,
                action: [
                    EnumPolicyAction.create,
                    EnumPolicyAction.read,
                    EnumPolicyAction.update,
                    EnumPolicyAction.delete,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
    },
    {
        name: TenantRolePlatformSupport,
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
            {
                subject: EnumPolicySubject.project,
                action: [EnumPolicyAction.read],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.tenant,
    },
    {
        name: ProjectRoleAdmin,
        description: 'Project administrator. Full project access.',
        abilities: [
            {
                subject: EnumPolicySubject.project,
                action: Object.values(EnumPolicyAction),
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.project,
    },
    {
        name: ProjectRoleEditor,
        description: 'Project editor. Can read and update projects.',
        abilities: [
            {
                subject: EnumPolicySubject.project,
                action: [
                    EnumPolicyAction.read,
                    EnumPolicyAction.update,
                ],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.project,
    },
    {
        name: ProjectRoleViewer,
        description: 'Project viewer. Read-only access to projects.',
        abilities: [
            {
                subject: EnumPolicySubject.project,
                action: [EnumPolicyAction.read],
            },
        ],
        type: EnumRoleType.user,
        scope: EnumRoleScope.project,
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
