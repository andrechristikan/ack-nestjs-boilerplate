import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigForgotPassword {
    expiredInMs: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMs: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs(
    'forgotPassword',
    (): IConfigForgotPassword => ({
        expiredInMs: ms('5m'),
        tokenLength: 100,
        linkBaseUrl: 'forgot-password',
        resendInMs: ms('2m'),
        reference: {
            prefix: 'FG',
            length: 25,
        },
    })
);
