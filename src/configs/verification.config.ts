import { registerAs } from '@nestjs/config';

export interface IConfigVerification {
    expiredInMinutes: number;
    otpLength: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs(
    'verification',
    (): IConfigVerification => ({
        expiredInMinutes: 5,
        otpLength: 6,
        reference: {
            prefix: 'VER',
            length: 10,
        },
    })
);
