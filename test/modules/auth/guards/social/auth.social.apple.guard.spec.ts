import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthSocialAppleGuard', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, string> = {
        'auth.apple.header': 'x-apple-token',
        'auth.apple.prefix': 'Apple',
    };

    let guard: AuthSocialAppleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => config[key]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialAppleGuard,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(AuthSocialAppleGuard);
    });

    it('validates the header token and attaches the social principal', async () => {
        const request: { headers: Record<string, string>; user?: unknown } = {
            headers: { 'x-apple-token': 'Apple identity-token' },
        };
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue(request);
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        authDomain.validateOAuthApple.mockResolvedValue({
            email: 'user@example.com',
            emailVerified: true,
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(authDomain.validateOAuthApple).toHaveBeenCalledWith(
            'identity-token'
        );
        expect(request.user).toEqual({
            email: 'user@example.com',
            emailVerified: true,
        });
    });

    it('rejects a missing provider header', async () => {
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({ headers: {} });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            AuthSocialAppleRequiredException
        );
        expect(authDomain.validateOAuthApple).not.toHaveBeenCalled();
    });
});
