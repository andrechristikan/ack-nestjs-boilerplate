import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigWorkspace {
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
        referenceMaxAttempts: number;
        expireChunkSize: number;
        linkPattern: string;
        signUpLinkPattern: string;
        expirySweepCron: string;
    };
    joinRequest: {
        reviewLinkPattern: string;
        expiresInMs: number;
        expireChunkSize: number;
    };
}

export default registerAs('workspace', (): IConfigWorkspace => ({
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
        referenceMaxAttempts: 5,
        expireChunkSize: 100,
        linkPattern: '{homeUrl}/workspace/invites?inviteToken={token}',
        signUpLinkPattern: '{homeUrl}/sign-up?inviteToken={token}',
        expirySweepCron: '0 0 * * *',
    },
    joinRequest: {
        reviewLinkPattern: '{homeUrl}/workspace/join-requests/{joinRequestId}',
        expiresInMs: ms('7d'),
        expireChunkSize: 100,
    },
}));
