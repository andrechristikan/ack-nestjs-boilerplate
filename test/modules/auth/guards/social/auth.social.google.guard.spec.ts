import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';

describe('AuthSocialGoogleGuard', () => {
    const authDomain = mock<AuthDomain>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let guard: AuthSocialGoogleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.google.header': 'Authorization',
                'auth.google.prefix': 'Bearer',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        guard = module.get(AuthSocialGoogleGuard);
    });

    describe('canActivate', () => {
        function buildContext(
            request: IRequestApp<IAuthSocialPayload>
        ): ExecutionContext {
            const executionContext = mock<ExecutionContext>();
            const httpArgumentsHost = mock<HttpArgumentsHost>();
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            return executionContext;
        }

        it('throws AuthSocialGoogleRequiredException when the header is absent', async () => {
            const request = mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = {};

            const rejection = guard.canActivate(buildContext(request));

            await expect(rejection).rejects.toBeInstanceOf(
                AuthSocialGoogleRequiredException
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
            const request = mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = { authorization: 'Bearer' };

            const rejection = guard.canActivate(buildContext(request));

            await expect(rejection).rejects.toBeInstanceOf(
                AuthSocialGoogleRequiredException
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
            const request = mock<IRequestApp<IAuthSocialPayload>>();
            request.headers = { authorization: 'Bearer id-token' };
            const payload: IAuthSocialPayload = {
                email: 'jane@example.com',
                emailVerified: true,
            };
            authDomain.validateOAuthGoogle.mockResolvedValue(payload);

            const result = await guard.canActivate(buildContext(request));

            expect(result).toBe(true);
            expect(request.user).toBe(payload);
            expect(authDomain.validateOAuthGoogle).toHaveBeenCalledWith(
                'id-token'
            );
        });
    });
});
