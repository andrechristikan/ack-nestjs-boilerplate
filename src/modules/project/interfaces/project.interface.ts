import { Project, ProjectMember, Role, Tenant, User } from '@prisma/client';

export type IProject = Project;

export interface IProjectMember extends ProjectMember {
    project?: Project;
    role?: Role;
    user?: User;
    tenant?: Tenant;
}
