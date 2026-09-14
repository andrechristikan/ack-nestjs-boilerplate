import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISession } from '@modules/session/interfaces/session.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionUtil } from '@modules/session/utils/session.util';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('SessionDomain', () => {
    const sessionRepository = createMock<SessionRepository>();
    const sessionCacheService = createMock<SessionCache>();
    const sessionUtil = createMock<SessionUtil>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = createMock<RequestStoreService>({
        get: <T>(key: string) => requestStoreGet(key) as T | null,
    });
    const databaseService = createDatabaseServiceMock();
    const helperDateService = createMock<HelperDateService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const userRef = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        photo: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const session = {
        id: 'session-id',
        userId: 'user-id',
        deviceOwnershipId: 'ownership-id',
        jti: 'private-jti',
        ipAddress: '127.0.0.1',
        userAgent: { ua: 'browser' },
        geoLocation: null,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        user: userRef,
        revokedBy: null,
    } satisfies ISession;
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };

    let service: SessionDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        requestStoreGet.mockReturnValue(requestLog);
        helperDateService.create.mockReturnValue(now);
        service = new SessionDomain(
            sessionRepository,
            sessionUtil,
            sessionCacheService,
            activityLogDomain,
            databaseService,
            helperDateService,
            requestStoreService
        );
    });

    it('delegates the active session cursor list for the owning user', async () => {
        const pagination = { limit: 20, cursorField: 'id' };
        const page = {
            type: EnumPaginationType.cursor,
            data: [session],
            count: 1,
            perPage: 20,
            hasNext: false,
        } satisfies IResponsePagingReturn<ISession>;
        sessionRepository.findActiveWithPaginationCursor.mockResolvedValue(
            page
        );

        await expect(
            service.getListCursor('user-id', pagination)
        ).resolves.toBe(page);
        expect(
            sessionRepository.findActiveWithPaginationCursor
        ).toHaveBeenCalledWith('user-id', pagination);
    });

    it('rejects self-revocation when no active owned session exists', async () => {
        sessionRepository.findOneActive.mockResolvedValue(null);

        await expect(
            service.revoke('user-id', 'foreign-session')
        ).rejects.toBeInstanceOf(SessionNotFoundException);
        expect(sessionRepository.revokeInTx).not.toHaveBeenCalled();
    });

    it('revokes an owned session and invalidates its cached login', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);

        await expect(
            service.revoke('user-id', 'session-id')
        ).resolves.toBeUndefined();
        expect(requestStoreGet).toHaveBeenCalledWith(RequestLogStoreKey);
        expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            'session-id',
            'user-id',
            expect.any(Date)
        );
        expect(sessionCacheService.deleteOneLogin).toHaveBeenCalledWith(
            'user-id',
            'session-id'
        );
    });

    it('revokes a user session as administrator and records audit metadata', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revokeByAdminInTx.mockResolvedValue(session);
        sessionUtil.mapActivityLogMetadata.mockReturnValue({
            sessionId: session.id,
            userId: session.userId,
            userUsername: session.user.username,
            timestamp: session.updatedAt,
        });

        await expect(
            service.revokeByAdmin('user-id', 'session-id', 'admin-id')
        ).resolves.toBeUndefined();
        expect(sessionRepository.revokeByAdminInTx).toHaveBeenCalledWith(
            expect.any(Object),
            'session-id',
            'admin-id',
            expect.any(Date)
        );
        expect(sessionCacheService.deleteOneLogin).toHaveBeenCalledWith(
            'user-id',
            'session-id'
        );
        expect(requestStoreService.merge).toHaveBeenCalled();
    });

    it('invalidates every active login returned before bulk revocation', async () => {
        sessionRepository.findActive.mockResolvedValue([
            { id: 'session-1' },
            { id: 'session-2' },
        ]);

        await service.deleteAllLogins('user-id');

        expect(sessionCacheService.deleteAllLogins).toHaveBeenCalledWith(
            'user-id',
            [{ id: 'session-1' }, { id: 'session-2' }]
        );
    });
});
