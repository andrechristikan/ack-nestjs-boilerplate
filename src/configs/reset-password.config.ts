import { registerAs } from '@nestjs/config';

export default registerAs(
    'resetPassword',
    (): Record<string, any> => ({
        expiredInMinutes: 5,
        otpLength: 6,
        tokenLength: 20,
        prefixUrl: 'reset-password',
        reference: {
            prefix: 'RES',
            length: 10,
        },
    })
);
