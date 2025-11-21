import { registerAs } from '@nestjs/config';

export interface IConfigVerification {
    expiredInMinutes: number;
    otpLength: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMinutes: number;
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
        tokenLength: 100,
        linkBaseUrl: 'verify-email',
        resendInMinutes: 2,
        reference: {
            prefix: 'VER',
            length: 25,
        },
    })
);
