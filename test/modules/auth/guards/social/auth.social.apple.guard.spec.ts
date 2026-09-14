import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthSocialAppleGuard', () => {
    const authService = {
        validateOAuthApple: vi.fn<AuthDomain['validateOAuthApple']>(),
    } satisfies Pick<AuthDomain, 'validateOAuthApple'>;
    const configService = createMock<ConfigService>({
        get: <T>(key: string) =>
            ({
                'auth.apple.header': 'x-apple-token',
                'auth.apple.prefix': 'Apple',
            })[key] as T | undefined,
    });

    let guard: AuthSocialAppleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialAppleGuard,
                { provide: AuthDomain, useValue: authService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(AuthSocialAppleGuard);
    });

    it('validates the header token and attaches the social principal', async () => {
        const request: { headers: Record<string, string>; user?: unknown } = {
            headers: { 'x-apple-token': 'Apple identity-token' },
        };
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });
        authService.validateOAuthApple.mockResolvedValue({
            email: 'user@example.com',
            emailVerified: true,
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(authService.validateOAuthApple).toHaveBeenCalledWith(
            'identity-token'
        );
        expect(request.user).toEqual({
            email: 'user@example.com',
            emailVerified: true,
        });
    });

    it('rejects a missing provider header', async () => {
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({ headers: {} }),
                }),
        });

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            AuthSocialAppleRequiredException
        );
        expect(authService.validateOAuthApple).not.toHaveBeenCalled();
    });
});
