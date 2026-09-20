import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

const otplibMocks = vi.hoisted(() => ({
    generateURI: vi.fn(() => 'otpauth://totp/ACK:user@example.com'),
}));

vi.mock(import('otplib'), () => otplibMocks);

describe('AuthTwoFactorUtil', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, unknown> = {
        'auth.twoFactor.strategy': 'totp',
        'auth.twoFactor.algorithm': 'sha1',
        'auth.twoFactor.issuer': 'ACK',
        'auth.twoFactor.digits': 6,
        'auth.twoFactor.periodInSeconds': 30,
    };

    let util: AuthTwoFactorUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        configGet.mockImplementation((key: string) => config[key]);
        const { AuthTwoFactorUtil: AuthTwoFactorUtilClass } =
            await import('@modules/auth/utils/auth.two-factor.util');
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorUtilClass,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        util = moduleRef.get(AuthTwoFactorUtilClass);
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
