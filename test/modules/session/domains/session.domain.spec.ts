import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISession } from '@modules/session/interfaces/session.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';

describe('SessionDomain', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx = mock<IDatabaseTransactionClient>();
    const requestLog = mock<IRequestLog>();
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
    let service: SessionDomain;

    beforeEach(async () => {
        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                SessionDomain,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: SessionCache, useValue: sessionCache },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = moduleRef.get(SessionDomain);
    });

    it('delegates the active session cursor list for the owning user', async () => {
        const pagination = { limit: 20, cursorField: 'id' };
        const page = {
            type: EnumPaginationType.cursor,
            data: [session],
            count: 1,
            perPage: 20,
            hasNext: false,
        } satisfies IResponsePaginationReturn<ISession>;
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

    it('delegates the administrator offset list with its revoke filter', async () => {
        const pagination = { limit: 20, page: 1, skip: 0 };
        const isRevoked = { isRevoked: { equals: true } };
        const page = {
            type: EnumPaginationType.offset,
            data: [session],
            count: 1,
            perPage: 20,
            hasNext: false,
            hasPrevious: false,
            page: 1,
            totalPage: 1,
        } satisfies IResponsePaginationReturn<ISession>;
        sessionRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
            page
        );

        await expect(
            service.getListOffsetByAdmin('user-id', pagination, isRevoked)
        ).resolves.toBe(page);
        expect(
            sessionRepository.findWithPaginationOffsetByAdmin
        ).toHaveBeenCalledWith('user-id', pagination, isRevoked);
    });

    it('returns an active owned session', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);

        await expect(
            service.validateActive('user-id', 'session-id')
        ).resolves.toBe(session);
    });

    it('forwards transaction-owned session writes and revocations', async () => {
        const expiredAt = new Date('2026-02-01T00:00:00.000Z');
        const created = { ...session, user: undefined, revokedBy: undefined };
        const refs = [{ id: 'session-id' }];
        sessionRepository.createInTx.mockResolvedValue(created);
        sessionRepository.updateJtiInTx.mockResolvedValue(true);
        sessionRepository.revokeInTx.mockResolvedValue(true);
        sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);
        sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(refs);

        await expect(
            service.createInTx(
                tx,
                'user-id',
                'session-id',
                'ownership-id',
                'jti',
                expiredAt,
                requestLog
            )
        ).resolves.toBe(created);
        await expect(
            service.updateJtiInTx(tx, 'session-id', 'next-jti')
        ).resolves.toBeUndefined();
        await expect(
            service.revokeInTx(tx, 'user-id', 'session-id', 'actor-id', now)
        ).resolves.toBeUndefined();
        await expect(
            service.revokeActiveByUserInTx(tx, 'user-id', 'actor-id', now)
        ).resolves.toBe(refs);
        await expect(
            service.revokeByDeviceOwnershipInTx(
                tx,
                'user-id',
                'ownership-id',
                'actor-id',
                now
            )
        ).resolves.toBe(refs);
        expect(sessionRepository.createInTx).toHaveBeenCalledWith(
            tx,
            'user-id',
            'session-id',
            'ownership-id',
            'jti',
            expiredAt,
            requestLog
        );
        expect(sessionRepository.updateJtiInTx).toHaveBeenCalledWith(
            tx,
            'session-id',
            'next-jti'
        );
        expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
            tx,
            'user-id',
            'session-id',
            'actor-id',
            now
        );
    });

    it('rejects a lost session JTI update inside a transaction', async () => {
        sessionRepository.updateJtiInTx.mockResolvedValue(false);

        await expect(
            service.updateJtiInTx(tx, 'session-id', 'next-jti')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
    });

    it('rejects a lost session revoke inside a transaction', async () => {
        sessionRepository.revokeInTx.mockResolvedValue(false);

        await expect(
            service.revokeInTx(tx, 'user-id', 'session-id', 'actor-id', now)
        ).rejects.toBeInstanceOf(SessionNotFoundException);
    });

    it('rejects self-revocation when no active owned session exists', async () => {
        sessionRepository.findOneActive.mockResolvedValue(null);

        await expect(
            service.revoke('user-id', 'foreign-session')
        ).rejects.toBeInstanceOf(SessionNotFoundException);
        expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });

    it('revokes an owned session and invalidates its cached login', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revoke.mockResolvedValue(true);

        await expect(
            service.revoke('user-id', 'session-id')
        ).resolves.toBeUndefined();
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.userRevokeSession,
        });
        expect(sessionRepository.revoke).toHaveBeenCalledWith(
            'user-id',
            'session-id',
            'user-id',
            expect.any(Date)
        );
        expect(sessionCache.deleteLogins).toHaveBeenCalledWith('user-id', [
            { id: 'session-id' },
        ]);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
            undefined,
        ]);
    });

    it('rejects a self revoke lost after active-session validation', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revoke.mockResolvedValue(false);

        await expect(
            service.revoke('user-id', 'session-id')
        ).rejects.toBeInstanceOf(SessionNotFoundException);
        expect(sessionCache.deleteLogins).not.toHaveBeenCalled();
    });

    it('revokes a user session as administrator and records audit metadata', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revokeByAdmin.mockResolvedValue(true);
        sessionUtil.mapActivityLogActorMetadata.mockReturnValue({
            sessionId: session.id,
            targetUserId: session.userId,
            targetUsername: session.user.username,
            timestamp: session.updatedAt,
        });
        sessionUtil.mapActivityLogTargetMetadata.mockReturnValue({
            actorUserId: 'admin-id',
            sessionId: session.id,
            timestamp: session.updatedAt,
        });

        await expect(
            service.revokeByAdmin('user-id', 'session-id', 'admin-id')
        ).resolves.toBeUndefined();
        expect(sessionRepository.revokeByAdmin).toHaveBeenCalledWith(
            'session-id',
            'admin-id',
            expect.any(Date)
        );
        expect(sessionCache.deleteLogins).toHaveBeenCalledWith('user-id', [
            { id: 'session-id' },
        ]);
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
            action: EnumActivityLogAction.adminSessionRevoke,
            metadata: {
                sessionId: session.id,
                targetUserId: session.userId,
                targetUsername: session.user.username,
                timestamp: session.updatedAt,
            },
        });
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
            action: EnumActivityLogAction.userRevokeSessionByAdmin,
            userId: 'user-id',
            createdBy: 'admin-id',
            metadata: {
                actorUserId: 'admin-id',
                sessionId: session.id,
                timestamp: session.updatedAt,
            },
        });
    });

    it('omits the target audit event when an administrator revokes their own session', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revokeByAdmin.mockResolvedValue(true);

        await service.revokeByAdmin('user-id', 'session-id', 'user-id');

        expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        expect(sessionUtil.mapActivityLogTargetMetadata).not.toHaveBeenCalled();
    });

    it('rejects an administrator revoke lost after active-session validation', async () => {
        sessionRepository.findOneActive.mockResolvedValue(session);
        sessionRepository.revokeByAdmin.mockResolvedValue(false);

        await expect(
            service.revokeByAdmin('user-id', 'session-id', 'admin-id')
        ).rejects.toBeInstanceOf(SessionNotFoundException);
        expect(sessionCache.deleteLogins).not.toHaveBeenCalled();
    });

    it('swallows failures while invalidating revoked-session cache entries', async () => {
        sessionCache.deleteLogins.mockRejectedValue(new Error('cache down'));

        await expect(
            service.purgeRevokedLogins('user-id', [{ id: 'session-id' }])
        ).resolves.toBeUndefined();
    });

    it('invalidates every cached login for a user', async () => {
        await service.purgeLoginsByUser('user-id');

        expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith('user-id');
    });

    it('swallows failures while invalidating every cached login', async () => {
        sessionCache.deleteLoginsByUser.mockRejectedValue(
            new Error('cache down')
        );

        await expect(
            service.purgeLoginsByUser('user-id')
        ).resolves.toBeUndefined();
    });

    it('prepares no administrator revoke-all events for an empty revoke', () => {
        expect(
            service.prepareRevokeAllByAdmin('user-id', 'admin-id', 0)
        ).toEqual([]);
    });

    it('prepares administrator and target revoke-all events', () => {
        const adminEvent = mock<IActivityLogStagedEvent>();
        const targetEvent = mock<IActivityLogStagedEvent>();
        activityLogDomain.prepare
            .mockReturnValueOnce(adminEvent)
            .mockReturnValueOnce(targetEvent);

        expect(
            service.prepareRevokeAllByAdmin('user-id', 'admin-id', 2)
        ).toEqual([adminEvent, targetEvent]);
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
            action: EnumActivityLogAction.adminSessionRevokeAll,
            metadata: { targetUserId: 'user-id', sessionCount: 2 },
        });
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
            action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
            userId: 'user-id',
            createdBy: 'admin-id',
            metadata: { actorUserId: 'admin-id', sessionCount: 2 },
        });
    });

    it('prepares only the administrator revoke-all event for the same actor', () => {
        const event = mock<IActivityLogStagedEvent>();
        activityLogDomain.prepare.mockReturnValue(event);

        expect(
            service.prepareRevokeAllByAdmin('user-id', 'user-id', 1)
        ).toEqual([event]);
        expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
    });

    it('prepares a self revoke-all event with its error-path flag', () => {
        const event = mock<IActivityLogStagedEvent>();
        activityLogDomain.prepare.mockReturnValue(event);

        expect(service.prepareRevokeAllSelf('user-id', true)).toEqual([event]);
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.userRevokeAllSessions,
            userId: 'user-id',
            createdBy: 'user-id',
            onError: true,
        });
    });

    it('finalizes revoke-all by purging cache before staging events', async () => {
        const event = mock<IActivityLogStagedEvent>();

        await service.finalizeRevokeAll('user-id', [event]);

        expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith('user-id');
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([event]);
    });

    it('rejects administrator revoke-all against the acting user', async () => {
        await expect(
            service.revokeAllByAdmin('user-id', 'user-id')
        ).rejects.toBeInstanceOf(UserNotSelfException);
        expect(sessionRepository.revokeActiveByUser).not.toHaveBeenCalled();
    });

    it('rejects administrator revoke-all when no session was active', async () => {
        sessionRepository.revokeActiveByUser.mockResolvedValue([]);

        await expect(
            service.revokeAllByAdmin('user-id', 'admin-id')
        ).rejects.toBeInstanceOf(SessionNotFoundException);
    });

    it('revokes every active session and finalizes its audit events', async () => {
        const sessions = [{ id: 'session-1' }, { id: 'session-2' }];
        const event = mock<IActivityLogStagedEvent>();
        sessionRepository.revokeActiveByUser.mockResolvedValue(sessions);
        activityLogDomain.prepare.mockReturnValue(event);

        await service.revokeAllByAdmin('user-id', 'admin-id');

        expect(sessionRepository.revokeActiveByUser).toHaveBeenCalledWith(
            'user-id',
            'admin-id',
            now
        );
        expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith('user-id');
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
            event,
            event,
        ]);
    });
});
