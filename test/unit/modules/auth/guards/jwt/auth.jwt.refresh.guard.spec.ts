import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { AuthJwtRefreshContextStoreKey } from '@modules/auth/constants/auth.constant';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type {
    IAuthJwtRefreshContext,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthJwtRefreshGuard', () => {
    const authService: MockProxy<AuthService> = mock<AuthService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: AuthJwtRefreshGuard;

    const payload: IAuthJwtRefreshTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
    };

    const authContext: IAuthJwtRefreshContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
        loginWith: EnumUserLoginWith.credential,
        token: 'refresh-token',
    };
    let executionContext: ReturnType<typeof buildHttpExecutionContext>;

    beforeEach(async () => {
        executionContext = buildHttpExecutionContext({
            headers: { authorization: 'Bearer refresh-token' },
        });
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshGuard,
                { provide: AuthService, useValue: authService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(AuthJwtRefreshGuard);
    });

    describe('handleRequest', () => {
        it('returns the context translated from the validated payload and the bearer token', () => {
            authService.validateJwtRefreshGuard.mockReturnValue(payload);

            const result = guard.handleRequest(
                null,
                payload,
                undefined,
                executionContext
            );

            expect(result).toEqual(authContext);
        });

        it('stores the refresh context and the actor id', () => {
            authService.validateJwtRefreshGuard.mockReturnValue(payload);

            guard.handleRequest(null, payload, undefined, executionContext);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                AuthJwtRefreshContextStoreKey,
                authContext
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestActorStoreKey,
                'user-1'
            );
        });

        it('throws AuthJwtRefreshTokenInvalidException without storing anything when the request carries no bearer token', () => {
            authService.validateJwtRefreshGuard.mockReturnValue(payload);
            const bare = buildHttpExecutionContext({ headers: {} });

            let thrown: unknown;
            try {
                guard.handleRequest(null, payload, undefined, bare);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('hands the service null for the false user Passport reports on a failed authentication', () => {
            const info = new Error('invalid signature');
            authService.validateJwtRefreshGuard.mockReturnValue(payload);

            guard.handleRequest(null, false, info, executionContext);

            expect(authService.validateJwtRefreshGuard).toHaveBeenCalledWith(
                null,
                null,
                info
            );
        });

        it('hands the service null for an info that is not an Error', () => {
            authService.validateJwtRefreshGuard.mockReturnValue(payload);

            guard.handleRequest(
                null,
                payload,
                'No auth token',
                executionContext
            );

            expect(authService.validateJwtRefreshGuard).toHaveBeenCalledWith(
                null,
                payload,
                null
            );
        });

        it('propagates the exception the domain throws, without storing anything', () => {
            const err = new Error('passport error');
            authService.validateJwtRefreshGuard.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException(err);
            });

            let thrown: unknown;
            try {
                guard.handleRequest(err, payload, undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
            });
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });
});
