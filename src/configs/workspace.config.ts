import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigWorkspace {
    personalNamePattern: string;
    slugPrefix: string;
    slugMaxLength: number;
    slugMaxAttempts: number;
    deletedSlugPattern: string;
    delete: {
        timeoutInMs: number;
    };
    invite: {
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
        expireChunkSize: number;
    };
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('workspace', (): IConfigWorkspace => ({
    personalNamePattern: "{username}'s workspace",
    slugPrefix: 'w-',
    slugMaxLength: 30,
    slugMaxAttempts: 5,
    deletedSlugPattern: 'deleted-{id}',
    delete: {
        timeoutInMs: ms('10s'),
    },
    invite: {
        tokenLength: 100,
        referencePrefix: 'WIN',
        referenceRandomLength: 25,
        referenceMaxAttempts: 5,
        expireChunkSize: 100,
        linkPattern: '{frontendBaseUrl}/workspace/invites?inviteToken={token}',
        signUpLinkPattern: '{frontendBaseUrl}/sign-up?inviteToken={token}',
        expirySweepCron: '0 * * * *',
    },
    joinRequest: {
        reviewLinkPattern:
            '{frontendBaseUrl}/workspace/join-requests/{joinRequestId}',
        expireChunkSize: 100,
    },
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
    },
}));
