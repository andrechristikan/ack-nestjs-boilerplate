import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { ConfigService } from '@nestjs/config';

const otplibMocks = vi.hoisted(() => ({
    generateURI: vi.fn(() => 'otpauth://totp/ACK:user@example.com'),
}));

vi.mock(import('otplib'), () => otplibMocks);

describe('AuthTwoFactorUtil', () => {
    let configService: ConfigService;
    let util: AuthTwoFactorUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        configService = new ConfigService({
            'auth.twoFactor.strategy': 'totp',
            'auth.twoFactor.algorithm': 'sha1',
            'auth.twoFactor.issuer': 'ACK',
            'auth.twoFactor.digits': 6,
            'auth.twoFactor.periodInSeconds': 30,
        });
        const { AuthTwoFactorUtil: AuthTwoFactorUtilClass } =
            await import('@modules/auth/utils/auth.two-factor.util');
        util = new AuthTwoFactorUtilClass(configService);
    });

    it('builds an authenticator URI with configured TOTP options', () => {
        expect(util.createKeyUri('user@example.com', 'SECRET')).toBe(
            'otpauth://totp/ACK:user@example.com'
        );
        expect(otplibMocks.generateURI).toHaveBeenCalledWith({
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
