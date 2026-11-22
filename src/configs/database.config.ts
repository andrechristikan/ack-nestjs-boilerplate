import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDatabase {
    url: string;
    debugEnabled: boolean;
    seedTransactionTimeoutInMs: number;
    seedBatchSize: number;
    connectTimeoutInMs: number;
    slowQueryThresholdInMs: number;
    warnWindowInMs: number;
}

export default registerAs('database', (): IConfigDatabase => {
    return {
        url: process.env.DATABASE_URL!,
        debugEnabled: process.env.DATABASE_DEBUG_ENABLED === 'true',
        seedTransactionTimeoutInMs: ms('60s'),
        seedBatchSize: 1000,
        connectTimeoutInMs: ms('5s'),
        slowQueryThresholdInMs: ms('500ms'),
        warnWindowInMs: ms('1m'),
    };
});
