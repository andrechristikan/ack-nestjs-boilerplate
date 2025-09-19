import { registerAs } from '@nestjs/config';

export interface IConfigVerification {
    expiredInMinutes: number;
    otpLength: number;
    tokenLength: number;
    linkBaseUrl: string;
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
        tokenLength: 20,
        linkBaseUrl: 'verify-email',
        reference: {
            prefix: 'VER',
            length: 10,
        },
    })
);
