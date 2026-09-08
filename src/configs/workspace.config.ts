import { registerAs } from '@nestjs/config';

export interface IConfigWorkspace {
    headerName: string;
    storeKey: string;
    maxWorkspacesPerUser: number;
    personalNamePattern: string;
    slugPrefix: string;
    slugRegex: RegExp;
    slugMaxLength: number;
    slugMaxAttempts: number;
    invite: {
        expiredInDays: number;
        tokenLength: number;
        referencePrefix: string;
        referenceRandomLength: number;
        linkPattern: string;
        signUpLinkPattern: string;
        expirySweepCron: string;
    };
    joinRequest: {
        reviewLinkPattern: string;
    };
}

export default registerAs('workspace', (): IConfigWorkspace => ({
    headerName: 'x-workspace-id',
    storeKey: 'workspaceId',
    maxWorkspacesPerUser: 10,
    personalNamePattern: "{username}'s Workspace",
    slugPrefix: 'w-',
    slugRegex: /^[0-9a-zA-Z-]+$/,
    slugMaxLength: 30,
    slugMaxAttempts: 5,
    invite: {
        expiredInDays: 7,
        tokenLength: 100,
        referencePrefix: 'WIN',
        referenceRandomLength: 25,
        linkPattern: '{homeUrl}/workspace/invites/{token}',
        signUpLinkPattern: '{homeUrl}/sign-up?inviteToken={token}',
        expirySweepCron: '0 0 * * *',
    },
    joinRequest: {
        reviewLinkPattern: '{homeUrl}/workspace/join-requests/{joinRequestId}',
    },
}));
