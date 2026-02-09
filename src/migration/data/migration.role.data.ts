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
