import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import { AuthService } from '@modules/auth/services/auth.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialContextStoreKey } from '@modules/auth/constants/auth.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('AuthSocialGoogleGuard', () => {
    const authService: MockProxy<AuthService> = mock<AuthService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let guard: AuthSocialGoogleGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthService, useValue: authService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(AuthSocialGoogleGuard);
    });

    describe('canActivate', () => {
        it('throws AuthSocialGoogleRequiredException when the header is absent', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
            });
        });

        it('throws AuthSocialGoogleRequiredException when the header carries no token', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { authorization: 'Bearer' };

            const rejection = guard.canActivate(
                buildHttpExecutionContext(request)
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
            });
        });

        it('validates the token and stores the social context', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { authorization: 'Bearer id-token' };
            const authContext: IAuthSocialContext = {
                email: 'jane@example.com',
                emailVerified: true,
                subject: 'subject-jane',
            };
            authService.validateOauthGoogle.mockResolvedValue(authContext);

            const result = await guard.canActivate(
                buildHttpExecutionContext(request)
            );

            expect(result).toBe(true);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                AuthSocialContextStoreKey,
                authContext
            );
            expect(authService.validateOauthGoogle).toHaveBeenCalledWith(
                'id-token'
            );
        });
    });
});
