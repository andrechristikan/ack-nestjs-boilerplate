import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthSocialGoogleGuard', () => {
    const authService = {
        validateOAuthGoogle: vi.fn<AuthDomain['validateOAuthGoogle']>(),
    } satisfies Pick<AuthDomain, 'validateOAuthGoogle'>;
    const configService = createMock<ConfigService>({
        get: <T>(key: string) =>
            ({
                'auth.google.header': 'x-google-token',
                'auth.google.prefix': 'Google',
            })[key] as T | undefined,
    });

    let guard: AuthSocialGoogleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthDomain, useValue: authService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(AuthSocialGoogleGuard);
    });

    it('validates the header token and attaches the social principal', async () => {
        const request: { headers: Record<string, string>; user?: unknown } = {
            headers: { 'x-google-token': 'Google identity-token' },
        };
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });
        authService.validateOAuthGoogle.mockResolvedValue({
            email: 'user@example.com',
            emailVerified: true,
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(authService.validateOAuthGoogle).toHaveBeenCalledWith(
            'identity-token'
        );
        expect(request.user).toEqual({
            email: 'user@example.com',
            emailVerified: true,
        });
    });

    it('rejects a missing or malformed provider header', async () => {
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({
                        headers: { 'x-google-token': 'token' },
                    }),
                }),
        });

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            AuthSocialGoogleRequiredException
        );
        expect(authService.validateOAuthGoogle).not.toHaveBeenCalled();
    });
});
