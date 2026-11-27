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
    challengeExpiresInMs: number;
    challengeRetentionInMs: number;
    purgeExpiredCron: string;
    backupCodes: {
        count: number;
        length: number;
    };
    passkey: {
        rpId: string;
        rpName: string;
        origins: string[];
    };
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
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
        challengeExpiresInMs: ms('5m'),
        challengeRetentionInMs: ms('7d'),
        purgeExpiredCron: '0 3 * * *',
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
        queue: {
            maxAttempts: 3,
            keepLogs: 20,
            removeOnCompleteAgeInSeconds: ms('7d') / 1000,
            removeOnFailAgeInSeconds: ms('14d') / 1000,
            backoffDelayInMs: ms('3s'),
        },
    };
});
