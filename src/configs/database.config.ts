import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDatabase {
    url: string;
    debugEnabled: boolean;
    seedTransactionTimeoutInMs: number;
    seedBatchSize: number;
    serverSelectionTimeoutInMs: number;
    connectTimeoutInMs: number;
    slowQueryThresholdInMs: number;
}

export default registerAs('database', (): IConfigDatabase => {
    return {
        url: process.env.DATABASE_URL!,
        debugEnabled: process.env.DATABASE_DEBUG_ENABLED === 'true',
        seedTransactionTimeoutInMs: ms('60s'),
        seedBatchSize: 1000,
        serverSelectionTimeoutInMs: ms('5s'),
        connectTimeoutInMs: ms('5s'),
        slowQueryThresholdInMs: ms('500ms'),
    };
});
