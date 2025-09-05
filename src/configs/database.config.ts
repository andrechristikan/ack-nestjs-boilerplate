import { registerAs } from '@nestjs/config';

export interface IConfigDatabase {
    url: string;
    readUrl?: string;
    debug: boolean;
}

export default registerAs(
    'database',
    (): IConfigDatabase => ({
        url:
            process.env?.DATABASE_URL ??
            'mongodb://localhost:27017,localhost:27018,localhost:27019',
        readUrl: process.env?.DATABASE_READ_URL,
        debug: process.env.DATABASE_DEBUG === 'true',
    })
);
