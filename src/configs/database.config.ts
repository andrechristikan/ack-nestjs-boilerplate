import { registerAs } from '@nestjs/config';

export default registerAs(
    'database',
    (): Record<string, any> => ({
        uri:
            process.env?.DATABASE_URI ??
            'mongodb://localhost:27017,localhost:27018,localhost:27019',

        debug: process.env.DATABASE_DEBUG === 'true',
        timeoutOptions: {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
            heartbeatFrequencyMS: 30000,
        },
    })
);
