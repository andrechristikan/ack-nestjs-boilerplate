import { registerAs } from '@nestjs/config';

export interface IConfigForgotPassword {
    expiredInMinutes: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMinutes: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs(
    'forgotPassword',
    (): IConfigForgotPassword => ({
        expiredInMinutes: 5,
        tokenLength: 50,
        linkBaseUrl: 'forgot-password',
        resendInMinutes: 2,
        reference: {
            prefix: 'FG',
            length: 25,
        },
    })
);
