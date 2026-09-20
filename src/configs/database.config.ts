import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDatabase {
    url: string;
    debug: boolean;
    seedTransactionTimeoutInMs: number;
}

export default registerAs('database', (): IConfigDatabase => ({
    url: process.env.DATABASE_URL!,
    debug: process.env.DATABASE_DEBUG === 'true',
    seedTransactionTimeoutInMs: ms('60s'),
}));
