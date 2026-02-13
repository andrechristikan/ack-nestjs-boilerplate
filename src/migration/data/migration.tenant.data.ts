import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    TenantRoleAdmin,
    TenantRoleUser,
} from '@modules/tenant/constants/tenant.constant';

export interface IMigrationTenantData {
    name: string;
    members: {
        userEmail: string;
        tenantRole: string;
    }[];
}

const tenantData: IMigrationTenantData[] = [
    {
        name: 'Default Organization',
        members: [
            { userEmail: 'admin@mail.com', tenantRole: TenantRoleAdmin },
            { userEmail: 'user@mail.com', tenantRole: TenantRoleUser },
        ],
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
