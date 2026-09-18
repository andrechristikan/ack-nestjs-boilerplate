import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthJwtAccessGuard', () => {
    const authService =
        createMock<Pick<AuthDomain, 'validateJwtAccessGuard'>>();
    const requestStoreService = createMock<Pick<RequestStoreService, 'set'>>();
    const payload = {
        userId: 'user-id',
        roleId: 'role-id',
        username: 'user',
        email: 'user@example.com',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        sub: 'user-id',
        jti: 'jti',
    } satisfies IAuthJwtAccessTokenPayload;

    let guard: AuthJwtAccessGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtAccessGuard,
                { provide: AuthDomain, useValue: authService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(AuthJwtAccessGuard);
    });

    it('stores and returns the principal accepted by AuthDomain', () => {
        authService.validateJwtAccessGuard.mockReturnValue(payload);
        const passportUser = { ...payload, jti: 'untrusted-jti' };

        expect(
            guard.handleRequest(
                undefined as unknown as Error,
                passportUser,
                undefined as unknown as Error
            )
        ).toBe(payload);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            AuthPayloadStoreKey,
            payload
        );
    });

    it('does not populate request state when validation rejects', () => {
        authService.validateJwtAccessGuard.mockImplementation(() => {
            throw new Error('rejected');
        });

        expect(() =>
            guard.handleRequest(
                new Error('passport error'),
                payload,
                new Error('info')
            )
        ).toThrow('rejected');
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
