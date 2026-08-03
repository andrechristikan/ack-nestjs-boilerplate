import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigVerification {
    expiredInMs: number;
    otpLength: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMs: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export default registerAs(
    'verification',
    (): IConfigVerification => ({
        expiredInMs: ms('5m'),
        otpLength: 6,
        tokenLength: 100,
        linkBaseUrl: 'verify-email',
        resendInMs: ms('2m'),
        reference: {
            prefix: 'VER',
            length: 25,
        },
    })
);
