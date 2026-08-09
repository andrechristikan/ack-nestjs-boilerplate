import { ProjectMember } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectMember extends ProjectMember {
    user: IUserRef;
}
