import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

vi.mock('otplib', () => ({
    generateURI: vi.fn(),
}));

describe('AuthTwoFactorUtil', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let generateURI: typeof import('otplib').generateURI;
    let AuthTwoFactorUtil: typeof import('@modules/auth/utils/auth.two-factor.util').AuthTwoFactorUtil;
    let util: InstanceType<typeof AuthTwoFactorUtil>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ generateURI } = await import('otplib'));
        ({ AuthTwoFactorUtil } =
            await import('@modules/auth/utils/auth.two-factor.util'));

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.strategy': 'totp',
                'auth.twoFactor.algorithm': 'sha1',
                'auth.twoFactor.issuer': 'AckBoilerplate',
                'auth.twoFactor.digits': 6,
                'auth.twoFactor.periodInSeconds': 30,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(AuthTwoFactorUtil);
    });

    describe('createKeyUri', () => {
        it('builds the otpauth key URI from the issuer, email and secret', () => {
            vi.mocked(generateURI).mockReturnValue('otpauth://totp/uri');

            const result = util.createKeyUri('jane@example.com', 'secret');

            expect(result).toBe('otpauth://totp/uri');
            expect(generateURI).toHaveBeenCalledWith({
                issuer: 'AckBoilerplate',
                label: 'AckBoilerplate:jane@example.com',
                secret: 'secret',
                digits: 6,
                period: 30,
                strategy: 'totp',
                algorithm: 'sha1',
            });
        });
    });
});
