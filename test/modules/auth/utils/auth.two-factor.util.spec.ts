import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { ConfigService } from '@nestjs/config';
import { generateURI } from 'otplib';

vi.mock(import('otplib'), () => ({
    generateURI: vi.fn(() => 'otpauth://totp/ACK:user@example.com'),
}));

describe('AuthTwoFactorUtil', () => {
    let configService: ConfigService;

    beforeEach(() => {
        vi.resetAllMocks();
        configService = new ConfigService({
            'auth.twoFactor.strategy': 'totp',
            'auth.twoFactor.algorithm': 'sha1',
            'auth.twoFactor.issuer': 'ACK',
            'auth.twoFactor.digits': 6,
            'auth.twoFactor.periodInSeconds': 30,
        });
    });

    it('builds an authenticator URI with configured TOTP options', () => {
        const util = new AuthTwoFactorUtil(configService);

        expect(util.createKeyUri('user@example.com', 'SECRET')).toBe(
            'otpauth://totp/ACK:user@example.com'
        );
        expect(vi.mocked(generateURI)).toHaveBeenCalledWith({
            issuer: 'ACK',
            label: 'ACK:user@example.com',
            secret: 'SECRET',
            digits: 6,
            period: 30,
            strategy: 'totp',
            algorithm: 'sha1',
        });
    });
});
