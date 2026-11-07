import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthJwtAccessGuard', () => {
    const authService: MockProxy<AuthService> = mock<AuthService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: AuthJwtAccessGuard;

    const payload: IAuthJwtAccessTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        email: 'jane@example.com',
        username: 'jane',
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
        roleId: 'role-1',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtAccessGuard,
                { provide: AuthService, useValue: authService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(AuthJwtAccessGuard);
    });

    describe('handleRequest', () => {
        it('stores the validated payload and returns it', () => {
            authService.validateJwtAccessGuard.mockReturnValue(payload);

            const result = guard.handleRequest(null, payload, undefined);

            expect(result).toBe(payload);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                AuthPayloadStoreKey,
                payload
            );
        });

        it('hands the service null for the false user Passport reports on a failed authentication', () => {
            const info = new Error('invalid signature');
            authService.validateJwtAccessGuard.mockReturnValue(payload);

            guard.handleRequest(null, false, info);

            expect(authService.validateJwtAccessGuard).toHaveBeenCalledWith(
                null,
                null,
                info
            );
        });

        it('hands the service null for an info that is not an Error', () => {
            authService.validateJwtAccessGuard.mockReturnValue(payload);

            guard.handleRequest(null, payload, 'No auth token');

            expect(authService.validateJwtAccessGuard).toHaveBeenCalledWith(
                null,
                payload,
                null
            );
        });

        it('propagates the exception the domain throws, without storing anything', () => {
            const err = new Error('passport error');
            authService.validateJwtAccessGuard.mockImplementation(() => {
                throw new AuthJwtAccessTokenInvalidException(err);
            });

            let thrown: unknown;
            try {
                guard.handleRequest(err, payload, undefined);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });
});
