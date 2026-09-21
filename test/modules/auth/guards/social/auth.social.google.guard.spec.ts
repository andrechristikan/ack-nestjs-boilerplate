import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthSocialGoogleGuard', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, string> = {
        'auth.google.header': 'x-google-token',
        'auth.google.prefix': 'Google',
    };

    let guard: AuthSocialGoogleGuard;

    beforeEach(async () => {
        configGet.mockImplementation((key: string) => config[key]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(AuthSocialGoogleGuard);
    });

    it('validates the header token and attaches the social principal', async () => {
        const request: { headers: Record<string, string>; user?: unknown } = {
            headers: { 'x-google-token': 'Google identity-token' },
        };
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue(request);
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        authDomain.validateOAuthGoogle.mockResolvedValue({
            email: 'user@example.com',
            emailVerified: true,
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(authDomain.validateOAuthGoogle).toHaveBeenCalledWith(
            'identity-token'
        );
        expect(request.user).toEqual({
            email: 'user@example.com',
            emailVerified: true,
        });
    });

    it('rejects a missing or malformed provider header', async () => {
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({
            headers: { 'x-google-token': 'token' },
        });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            AuthSocialGoogleRequiredException
        );
        expect(authDomain.validateOAuthGoogle).not.toHaveBeenCalled();
    });
});
