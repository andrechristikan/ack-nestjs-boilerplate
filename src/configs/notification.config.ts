import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigNotification {
    push: {
        cleanupDedupTtlInMs: number;
        cleanupStaleTokensCron: string;
        staleTokenThresholdInMs: number;
    };
}

export default registerAs('notification', (): IConfigNotification => ({
    push: {
        cleanupDedupTtlInMs: ms('1h'),
        cleanupStaleTokensCron: '0 0 * * *',
        staleTokenThresholdInMs: ms('30d'),
    },
}));
