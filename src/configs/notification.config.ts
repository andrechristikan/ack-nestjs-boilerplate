import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigNotification {
    dedupTtlInMs: number;
    push: {
        cleanupDedupTtlInMs: number;
        cleanupStaleTokensCron: string;
        staleTokenThresholdInMs: number;
    };
}

export default registerAs('notification', (): IConfigNotification => ({
    dedupTtlInMs: ms('1s'),
    push: {
        cleanupDedupTtlInMs: ms('1h'),
        cleanupStaleTokensCron: '0 0 * * *',
        staleTokenThresholdInMs: ms('30d'),
    },
}));
