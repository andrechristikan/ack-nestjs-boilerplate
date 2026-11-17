import { registerAs } from '@nestjs/config';
import ms from 'ms';
import type { HashAlgorithm, OTPStrategy } from 'otplib';

export interface IConfigMfa {
    totp: {
        strategy: OTPStrategy;
        algorithm: HashAlgorithm;
        issuer: string;
        digits: number;
        periodInSeconds: number;
        window: number;
        secretLength: number;
        encryptionSecret: string;
    };
    challengeTtlInMs: number;
    backupCodes: {
        count: number;
        length: number;
    };
    passkey: {
        rpId: string;
        rpName: string;
        origins: string[];
    };
}

export default registerAs('mfa', (): IConfigMfa => {
    return {
        totp: {
            strategy: 'totp',
            algorithm: 'sha1',
            issuer: process.env.MFA_TOTP_ISSUER!,
            digits: 6,
            periodInSeconds: ms('30s') / 1000,
            window: 1,
            secretLength: 32,
            encryptionSecret: process.env.MFA_TOTP_ENCRYPTION_SECRET!,
        },
        challengeTtlInMs: ms('5m'),
        backupCodes: {
            count: 8,
            length: 10,
        },
        passkey: {
            rpId: process.env.MFA_PASSKEY_RP_ID!,
            rpName: process.env.APP_NAME!,
            origins: process.env
                .MFA_PASSKEY_ORIGINS!.split(',')
                .map(origin => origin.trim())
                .filter(origin => origin !== ''),
        },
    };
});
