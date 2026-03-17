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
        name: 'First Project',
        description: 'Primary project for default organization',
        tenantName: 'Default Organization',
        members: [
            {
                userEmail: 'admin@mail.com',
                projectRole: EnumProjectMemberRole.admin,
            },
            {
                userEmail: 'user@mail.com',
                projectRole: EnumProjectMemberRole.viewer,
            },
        ],
    },
    {
        name: 'First Project',
        description: 'Primary project for another organization',
        tenantName: 'Another Organization',
        members: [
            {
                userEmail: 'admin@mail.com',
                projectRole: EnumProjectMemberRole.admin,
            },
        ],
    },
];

export const migrationProjectData: Record<
    EnumAppEnvironment,
    IMigrationProjectData[]
> = {
    [EnumAppEnvironment.local]: projectData,
    [EnumAppEnvironment.development]: projectData,
    [EnumAppEnvironment.staging]: projectData,
    [EnumAppEnvironment.production]: [],
};
