import { registerAs } from '@nestjs/config';

export interface IConfigResetPassword {
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
    'resetPassword',
    (): IConfigResetPassword => ({
        expiredInMinutes: 5,
        tokenLength: 50,
        linkBaseUrl: 'reset-password',
        resendInMinutes: 2,
        reference: {
            prefix: 'RES',
            length: 25,
        },
    })
);
