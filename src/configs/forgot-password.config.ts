import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigForgotPassword {
    expiresInMinutes: number;
    tokenLength: number;
    linkPattern: string;
    resendInMinutes: number;
    retentionInMs: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs('forgotPassword', (): IConfigForgotPassword => ({
    expiresInMinutes: ms('5m') / ms('1m'),
    tokenLength: 100,
    linkPattern: '{frontendBaseUrl}/forgot-password?token={token}',
    resendInMinutes: ms('2m') / ms('1m'),
    retentionInMs: ms('90d'),
    reference: {
        prefix: 'FG',
        length: 25,
    },
}));
