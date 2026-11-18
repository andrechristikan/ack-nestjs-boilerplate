import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigVerification {
    expiresInMinutes: number;
    otpLength: number;
    tokenLength: number;
    linkPattern: string;
    resendInMinutes: number;
    retentionInMs: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs('verification', (): IConfigVerification => ({
    expiresInMinutes: ms('5m') / ms('1m'),
    otpLength: 6,
    tokenLength: 100,
    linkPattern: '{frontendBaseUrl}/verify-email/{token}',
    resendInMinutes: ms('2m') / ms('1m'),
    retentionInMs: ms('90d'),
    reference: {
        prefix: 'VER',
        length: 25,
    },
}));
