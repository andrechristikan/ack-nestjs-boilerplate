import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('AuthSocialAppleGuard', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let guard: AuthSocialAppleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.apple.header': 'Authorization',
                'auth.apple.prefix': 'Bearer',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialAppleGuard,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        guard = module.get(AuthSocialAppleGuard);
    });

    describe('canActivate', () => {
        it('throws AuthSocialAppleRequiredException when the header is absent', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = {};

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialAppleRequired
                    ],
                messagePath: 'auth.error.socialAppleRequired',
            });
        });

        it('throws AuthSocialAppleRequiredException when the header carries no token', async () => {
            const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
                mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = { authorization: 'Bearer' };

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialAppleRequired
                    ],
                messagePath: 'auth.error.socialAppleRequired',
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
            authDomain.validateOAuthApple.mockResolvedValue(payload);

            const result = await guard.canActivate(
                buildHttpExecutionContext(request)
            );

            expect(result).toBe(true);
            expect(request.user).toBe(payload);
            expect(authDomain.validateOAuthApple).toHaveBeenCalledWith(
                'id-token'
            );
        });
    });
});
