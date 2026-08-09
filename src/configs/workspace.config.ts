import { registerAs } from '@nestjs/config';

export interface IConfigWorkspace {
    headerName: string;
    storeKey: string;
    maxWorkspacesPerUser: number;
    personalNamePattern: string;
    slugPrefix: string;
    slugPattern: RegExp;
    slugMaxLength: number;
    slugMaxAttempts: number;
    invite: {
        expiredInDays: number;
        tokenLength: number;
        referencePrefix: string;
        referenceRandomLength: number;
        linkBaseUrl: string;
        signupLinkBaseUrl: string;
        expirySweepCron: string;
    };
    joinRequest: {
        reviewLinkBaseUrl: string;
    };
}

export default registerAs('workspace', (): IConfigWorkspace => ({
    headerName: 'x-workspace-id',
    storeKey: 'workspaceId',
    maxWorkspacesPerUser: 10,
    personalNamePattern: "{username}'s Workspace",
    slugPrefix: 'w-',
    slugPattern: /^[0-9a-zA-Z-]+$/,
    slugMaxLength: 30,
    slugMaxAttempts: 5,
    invite: {
        expiredInDays: 7,
        tokenLength: 100,
        referencePrefix: 'WIN',
        referenceRandomLength: 25,
        linkBaseUrl: 'workspace/invites',
        signupLinkBaseUrl: 'sign-up',
        expirySweepCron: '0 0 * * *',
    },
    joinRequest: {
        reviewLinkBaseUrl: 'workspace/join-requests',
    },
}));
