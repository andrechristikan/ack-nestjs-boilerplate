import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigForgotPassword {
    expiredInMinutes: number;
    tokenLength: number;
    linkPattern: string;
    resendInMinutes: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs('forgotPassword', (): IConfigForgotPassword => ({
    expiredInMinutes: ms('5m') / ms('1m'),
    tokenLength: 100,
    linkPattern: '{homeUrl}/forgot-password/{token}',
    resendInMinutes: ms('2m') / ms('1m'),
    reference: {
        prefix: 'FG',
        length: 25,
    },
}));
