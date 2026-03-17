import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    ProjectRoleAdmin,
    ProjectRoleViewer,
} from '@modules/project/constants/project.constant';

export interface IMigrationProjectData {
    name: string;
    description?: string;
    tenantName: string;
    members: {
        userEmail: string;
        projectRole: string;
    }[];
}

const projectData: IMigrationProjectData[] = [
    {
        name: 'First Project',
        description: 'Primary project for default organization',
        tenantName: 'Default Organization',
        members: [
            { userEmail: 'admin@mail.com', projectRole: ProjectRoleAdmin },
            { userEmail: 'user@mail.com', projectRole: ProjectRoleViewer },
        ],
    },
    {
        name: 'First Project',
        description: 'Primary project for another organization',
        tenantName: 'Another Organization',
        members: [
            { userEmail: 'admin@mail.com', projectRole: ProjectRoleAdmin },
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
