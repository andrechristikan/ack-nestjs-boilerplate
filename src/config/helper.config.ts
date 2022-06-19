import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'helper',
    (): Record<string, any> => ({
        salt: {
            length: 8,
        },
        jwt: {
            secretKey: '123456',
            expirationTime: ms('1h'),
            notBeforeExpirationTime: ms(0),
        },
    })
);
