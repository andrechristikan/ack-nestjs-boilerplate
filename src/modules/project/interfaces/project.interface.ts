import type { ProjectMember } from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectMember extends ProjectMember {
    user: IUserRef;
}

export interface IProjectCreate {
    name: string;
    description?: string;
}

export interface IProjectUpdate {
    name?: string;
    description?: string;
}
