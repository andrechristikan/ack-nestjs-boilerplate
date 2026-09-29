import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthJwtRefreshGuard', () => {
    const authDomain = mock<AuthDomain>();
    const requestStoreService = mock<RequestStoreService>();
    let guard: AuthJwtRefreshGuard;

    const payload: IAuthJwtRefreshTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshGuard,
                { provide: AuthDomain, useValue: authDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(AuthJwtRefreshGuard);
    });

    describe('handleRequest', () => {
        it('stores the validated payload and returns it', () => {
            authDomain.validateJwtRefreshGuard.mockReturnValue(payload);

            const result = guard.handleRequest(
                undefined as unknown as Error,
                payload,
                undefined as unknown as Error
            );

            expect(result).toBe(payload);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                AuthPayloadStoreKey,
                payload
            );
        });

        it('propagates the exception the domain throws, without storing anything', () => {
            const err = new Error('passport error');
            authDomain.validateJwtRefreshGuard.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException(err);
            });

            let thrown: unknown;
            try {
                guard.handleRequest(
                    err,
                    payload,
                    undefined as unknown as Error
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });
});
