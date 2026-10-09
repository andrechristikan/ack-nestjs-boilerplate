import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('AuthSocialGoogleGuard', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();

    let guard: AuthSocialGoogleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthDomain, useValue: authDomain },
            ],
        }).compile();

        guard = module.get(AuthSocialGoogleGuard);
    });

    describe('canActivate', () => {
        it('throws AuthSocialGoogleRequiredException when the header is absent', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = {};

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleRequired
                    ],
                messagePath: 'auth.error.socialGoogleRequired',
            });
        });

        it('throws AuthSocialGoogleRequiredException when the header carries no token', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = { authorization: 'Bearer' };

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleRequired
                    ],
                messagePath: 'auth.error.socialGoogleRequired',
            });
        });

        it('validates the token and attaches the social payload to the request', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = { authorization: 'Bearer id-token' };
            const payload: IAuthSocialPayload = {
                email: 'jane@example.com',
                emailVerified: true,
            };
            authDomain.validateOAuthGoogle.mockResolvedValue(payload);

            const result = await guard.canActivate(
                buildHttpExecutionContext(request)
            );

            expect(result).toBe(true);
            expect(request.user).toBe(payload);
            expect(authDomain.validateOAuthGoogle).toHaveBeenCalledWith(
                'id-token'
            );
        });
    });
});
