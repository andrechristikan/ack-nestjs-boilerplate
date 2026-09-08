import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigVerification {
    expiredInMs: number;
    otpLength: number;
    tokenLength: number;
    linkPattern: string;
    resendInMs: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs('verification', (): IConfigVerification => ({
    expiredInMs: ms('5m'),
    otpLength: 6,
    tokenLength: 100,
    linkPattern: '{homeUrl}/verify-email/{token}',
    resendInMs: ms('2m'),
    reference: {
        prefix: 'VER',
        length: 25,
    },
}));
