import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigNotification {
    dedupTtlInMs: number;
    push: {
        cleanupStaleTokensCron: string;
        staleTokenThresholdInMs: number;
    };
}

export default registerAs('notification', (): IConfigNotification => ({
    dedupTtlInMs: ms('1s'),
    push: {
        cleanupStaleTokensCron: '0 0 * * *',
        staleTokenThresholdInMs: ms('30d'),
    },
}));
