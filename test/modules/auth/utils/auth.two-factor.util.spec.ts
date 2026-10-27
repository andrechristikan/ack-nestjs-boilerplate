import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

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
        configGet.mockImplementation((key: string) => config[key]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        util = moduleRef.get(AuthTwoFactorUtil);
    });

    it('builds an authenticator URI with configured TOTP options', () => {
        const uri = new URL(
            util.createKeyUri('user@example.com', 'JBSWY3DPEHPK3PXP')
        );

        expect(uri.protocol).toBe('otpauth:');
        expect(uri.host).toBe('totp');
        expect(decodeURIComponent(uri.pathname)).toBe(
            '/ACK:ACK:user@example.com'
        );
        expect(uri.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
        expect(uri.searchParams.get('issuer')).toBe('ACK');
        // defaults (6 digits, 30s, sha1) are omitted from the URI by otplib
        expect(uri.searchParams.get('digits')).toBeNull();
        expect(uri.searchParams.get('period')).toBeNull();
    });
});
