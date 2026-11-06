import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigVerification {
    expiredInMinutes: number;
    otpLength: number;
    tokenLength: number;
    linkPattern: string;
    resendInMinutes: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs('verification', (): IConfigVerification => ({
    expiredInMinutes: ms('5m') / ms('1m'),
    otpLength: 6,
    tokenLength: 100,
    linkPattern: '{homeUrl}/verify-email/{token}',
    resendInMinutes: ms('2m') / ms('1m'),
    reference: {
        prefix: 'VER',
        length: 25,
    },
}));
