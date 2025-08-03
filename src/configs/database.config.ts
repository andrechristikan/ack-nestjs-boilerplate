import { registerAs } from '@nestjs/config';

export interface IConfigDatabase {
    url: string;
    debug: boolean;
    slowQueryThreshold: number; // in milliseconds
    sampleRate: number; // percentage of operations to sample for profiling
    timeoutOptions: {
        serverSelectionTimeoutMS: number; // in milliseconds
        socketTimeoutMS: number; // in milliseconds
        heartbeatFrequencyMS: number; // in milliseconds
    };
    poolOptions: {
        maxPoolSize: number;
        minPoolSize: number;
        maxIdleTimeMS: number; // in milliseconds
        waitQueueTimeoutMS: number; // in milliseconds
    };
}

export default registerAs(
    'database',
    (): IConfigDatabase => ({
        url:
            process.env?.DATABASE_URL ??
            'mongodb://localhost:27017,localhost:27018,localhost:27019',

        debug: process.env.DATABASE_DEBUG === 'true',
        slowQueryThreshold: 500, // Default 0.5 seconds
        sampleRate: 0.1, // 10% of operations
        timeoutOptions: {
            serverSelectionTimeoutMS: 30 * 1000, // 30 secs
            socketTimeoutMS: 30 * 1000, // 30 secs
            heartbeatFrequencyMS: 5 * 1000, // 30 secs
        },
        poolOptions: {
            maxPoolSize: 20,
            minPoolSize: 5,
            maxIdleTimeMS: 60000,
            waitQueueTimeoutMS: 30000,
        },
    })
);
