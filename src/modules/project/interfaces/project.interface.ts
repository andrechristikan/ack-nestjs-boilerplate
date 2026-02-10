import { Project, ProjectMember, ProjectShare, Role, Tenant, User } from '@prisma/client';

export type IProject = Project;

export interface IProjectMember extends ProjectMember {
    project?: Project;
    role?: Role;
    user?: User;
}

export interface IProjectShare extends ProjectShare {
    project?: Project;
    user?: User;
    tenant?: Tenant;
}
