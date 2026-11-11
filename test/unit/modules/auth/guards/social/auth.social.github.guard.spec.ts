import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialGithubGuard } from '@modules/auth/guards/social/auth.social.github.guard';
import { AuthService } from '@modules/auth/services/auth.service';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';
import { expectGithubGuardRequired } from '@test/unit/helpers/test.unit.auth.helper';

describe('AuthSocialGithubGuard', () => {
    const authService: MockProxy<AuthService> = mock<AuthService>();
    const body = {
        code: 'github-code',
        redirectUri: 'https://app.example.com/callback',
        codeVerifier: 'a'.repeat(43),
    };

    let guard: AuthSocialGithubGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGithubGuard,
                { provide: AuthService, useValue: authService },
            ],
        }).compile();

        guard = module.get(AuthSocialGithubGuard);
    });

    describe('canActivate', () => {
        it('throws AuthSocialGithubRequiredException when the body is missing', async () => {
            await expectGithubGuardRequired(guard, authService, undefined);
        });

        it.each(['code', 'redirectUri', 'codeVerifier'])(
            'throws AuthSocialGithubRequiredException when %s is missing',
            async field => {
                const { [field]: _removed, ...rest } = body as Record<
                    string,
                    string
                >;

                await expectGithubGuardRequired(guard, authService, rest);
            }
        );

        it('throws AuthSocialGithubRequiredException when the verifier is malformed', async () => {
            await expectGithubGuardRequired(guard, authService, {
                ...body,
                codeVerifier: 'short',
            });
        });

        it('validates the code and attaches the social payload to the request', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.body = { ...body, username: 'jane', from: 'website' };
            const payload: IAuthSocialPayload = {
                email: 'jane@example.com',
                emailVerified: true,
            };
            authService.validateOAuthGithub.mockResolvedValue(payload);

            const result = await guard.canActivate(
                buildHttpExecutionContext(request)
            );

            expect(result).toBe(true);
            expect(request.user).toBe(payload);
            expect(authService.validateOAuthGithub).toHaveBeenCalledWith(
                body.code,
                body.redirectUri,
                body.codeVerifier
            );
        });
    });
});
