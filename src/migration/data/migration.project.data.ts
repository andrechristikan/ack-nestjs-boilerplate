import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    ProjectRoleAdmin,
    ProjectRoleViewer,
} from '@modules/project/constants/project.constant';

export interface IMigrationProjectData {
    name: string;
    tenantName: string;
    ownerUserEmail?: string;
    members: {
        userEmail: string;
        projectRole: string;
    }[];
}

const projectData: IMigrationProjectData[] = [
    {
        name: 'First Project',
        tenantName: 'Default Organization',
        ownerUserEmail: 'admin@mail.com',
        members: [
            { userEmail: 'admin@mail.com', projectRole: ProjectRoleAdmin },
            { userEmail: 'user@mail.com', projectRole: ProjectRoleViewer },
        ],
    },
    {
        name: 'First Project',
        tenantName: 'Another Organization',
        ownerUserEmail: 'admin@mail.com',
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
