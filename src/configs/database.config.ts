import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDatabase {
    url: string;
    debug: boolean;
    seedTransactionTimeoutInMs: number;
    serverSelectionTimeoutInMs: number;
    connectTimeoutInMs: number;
    slowQueryThresholdInMs: number;
    warnWindowInMs: number;
}

export default registerAs('database', (): IConfigDatabase => {
    return {
        url: process.env.DATABASE_URL!,
        debug: process.env.DATABASE_DEBUG === 'true',
        seedTransactionTimeoutInMs: ms('60s'),
        serverSelectionTimeoutInMs: ms('5s'),
        connectTimeoutInMs: ms('5s'),
        slowQueryThresholdInMs: ms('500ms'),
        warnWindowInMs: ms('1m'),
    };
});
