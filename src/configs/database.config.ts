import { registerAs } from '@nestjs/config';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';

export default registerAs(
    'database',
    (): Record<string, any> => ({
        type: process.env.DATABASE_TYPE || ENUM_DATABASE_TYPE.MONGO,
        host: process.env.DATABASE_HOST || 'mongodb://localhost:27017',
        name: process.env.DATABASE_NAME || 'ack',
        user: process.env.DATABASE_USER || null,
        password: process.env.DATABASE_PASSWORD || null,
        debug: process.env.DATABASE_DEBUG === 'true' || false,
        options: process.env.DATABASE_OPTIONS,
    })
);
