import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'request',
    (): Record<string, any> => ({
        timeout: ms('30s'), // 30s based on ms module
    })
);
