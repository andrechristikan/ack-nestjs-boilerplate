import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumProjectMemberRole } from '@generated/prisma-client';

export interface IMigrationProjectData {
    name: string;
    description?: string;
    tenantName: string;
    members: {
        userEmail: string;
        projectRole: EnumProjectMemberRole;
    }[];
}

const projectData: IMigrationProjectData[] = [
    {
        name: 'Default Project',
        description: "Default project for Super Admin's Workspace",
        tenantName: "Super Admin's Workspace",
        members: [{ userEmail: 'superadmin@mail.com', projectRole: EnumProjectMemberRole.admin }],
    },
    {
        name: 'Default Project',
        description: "Default project for Admin's Workspace",
        tenantName: "Admin's Workspace",
        members: [{ userEmail: 'admin@mail.com', projectRole: EnumProjectMemberRole.admin }],
    },
    {
        name: 'Default Project',
        description: "Default project for User's Workspace",
        tenantName: "User's Workspace",
        members: [{ userEmail: 'user@mail.com', projectRole: EnumProjectMemberRole.admin }],
    },
];

export const migrationProjectData: Record<
    EnumAppEnvironment,
    IMigrationProjectData[]
> = {
    [EnumAppEnvironment.local]: projectData,
    [EnumAppEnvironment.development]: projectData,
    [EnumAppEnvironment.staging]: [],
    [EnumAppEnvironment.production]: [],
};
