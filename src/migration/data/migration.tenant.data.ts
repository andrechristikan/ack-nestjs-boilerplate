import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumTenantMemberRole } from '@generated/prisma-client';

export interface IMigrationTenantData {
    name: string;
    description?: string;
    members: {
        userEmail: string;
        tenantRole: EnumTenantMemberRole;
    }[];
}

const tenantData: IMigrationTenantData[] = [
    {
        name: "Super Admin's Workspace",
        description: 'Personal workspace for Super Admin',
        members: [{ userEmail: 'superadmin@mail.com', tenantRole: EnumTenantMemberRole.admin }],
    },
    {
        name: "Admin's Workspace",
        description: 'Personal workspace for Admin',
        members: [{ userEmail: 'admin@mail.com', tenantRole: EnumTenantMemberRole.admin }],
    },
    {
        name: "User's Workspace",
        description: 'Personal workspace for User',
        members: [{ userEmail: 'user@mail.com', tenantRole: EnumTenantMemberRole.admin }],
    },
];

export const migrationTenantData: Record<EnumAppEnvironment, IMigrationTenantData[]> =
    {
        [EnumAppEnvironment.local]: tenantData,
        [EnumAppEnvironment.development]: tenantData,
        [EnumAppEnvironment.staging]: [],
        [EnumAppEnvironment.production]: [],
    };
