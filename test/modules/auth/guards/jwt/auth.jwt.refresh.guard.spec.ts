import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthJwtRefreshGuard', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const payload = {
        userId: 'user-id',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        sub: 'user-id',
        jti: 'jti',
    } satisfies IAuthJwtRefreshTokenPayload;

    let guard: AuthJwtRefreshGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshGuard,
                { provide: AuthDomain, useValue: authDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(AuthJwtRefreshGuard);
    });

    it('stores and returns the validated refreshInTx principal', () => {
        authDomain.validateJwtRefreshGuard.mockReturnValue(payload);

        expect(
            guard.handleRequest(
                undefined as unknown as Error,
                payload,
                undefined as unknown as Error
            )
        ).toBe(payload);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            AuthPayloadStoreKey,
            payload
        );
    });
});
