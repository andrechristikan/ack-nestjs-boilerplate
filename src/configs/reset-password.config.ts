import { registerAs } from '@nestjs/config';

export interface IConfigResetPassword {
    expiredInMinutes: number;
    otpLength: number;
    tokenLength: number;
    prefixUrl: string;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs(
    'resetPassword',
    (): IConfigResetPassword => ({
        expiredInMinutes: 5,
        otpLength: 6,
        tokenLength: 50,
        prefixUrl: 'reset-password',
        reference: {
            prefix: 'RES',
            length: 10,
        },
    })
);
