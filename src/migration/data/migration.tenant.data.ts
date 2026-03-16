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
        name: 'Default Organization',
        description: 'Default workspace for local development',
        members: [
            { userEmail: 'admin@mail.com', tenantRole: EnumTenantMemberRole.admin },
            { userEmail: 'user@mail.com', tenantRole: EnumTenantMemberRole.member },
        ],
    },
    {
        name: 'Another Organization',
        description: 'Secondary workspace for local development',
        members: [{ userEmail: 'admin@mail.com', tenantRole: EnumTenantMemberRole.admin }],
    },
];

export const migrationTenantData: Record<
    EnumAppEnvironment,
    IMigrationTenantData[]
> = {
    [EnumAppEnvironment.local]: tenantData,
    [EnumAppEnvironment.development]: tenantData,
    [EnumAppEnvironment.staging]: tenantData,
    [EnumAppEnvironment.production]: [],
};
