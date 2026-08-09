import { WorkspaceMember } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IWorkspaceMember extends WorkspaceMember {
    user: IUserRef;
}

export interface IWorkspaceInviteInviter {
    name: string | null;
    username: string;
}

export interface IWorkspaceInviteTokenData {
    token: string;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    link: string;
}

export interface IWorkspaceJoinRequestRequester {
    name: string | null;
    username: string;
}
