import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type {
    ISession,
    ISessionList,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionUtil } from '@modules/session/utils/session.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('SessionDomain', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let domain: SessionDomain;

    const session: ISession = {
        id: 'session-1',
        userId: 'user-1',
        deviceOwnershipId: 'device-ownership-1',
        jti: 'jti-value',
        ipAddress: '127.0.0.1',
        userAgent: {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        geoLocation: null,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
        revokedBy: null,
    };

    const baseEvent: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userRevokeSession,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionDomain,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: SessionCache, useValue: sessionCache },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(SessionDomain);
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository with the pagination params and revoked filter', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const isRevoked = { isRevoked: { equals: true } };
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [],
            };
            sessionRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                paginationResult
            );

            const result = await domain.getListOffsetByAdmin(
                'user-1',
                pagination,
                isRevoked
            );

            expect(result).toBe(paginationResult);
            expect(
                sessionRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, isRevoked);
        });

        it('passes a null revoked filter when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            sessionRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                sessionRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, null);
        });
    });

    describe('getListCursor', () => {
        it('delegates to the repository with the cursor pagination params', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput> =
                { limit: 20, orderBy: [] };
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            sessionRepository.findActiveWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await domain.getListCursor('user-1', pagination);

            expect(result).toBe(paginationResult);
            expect(
                sessionRepository.findActiveWithPaginationCursor
            ).toHaveBeenCalledWith('user-1', pagination);
        });
    });

    describe('validateActive', () => {
        it('returns the active session', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);

            const result = await domain.validateActive('user-1', 'session-1');

            expect(result).toBe(session);
        });

        it('throws SessionNotFoundException when no active session is found', async () => {
            sessionRepository.findOneActive.mockResolvedValue(null);

            const rejection = domain.validateActive('user-1', 'session-1');

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const requestLog = {
                userAgent: session.userAgent,
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            const created: Session = {
                id: 'session-1',
                userId: 'user-1',
                deviceOwnershipId: 'device-ownership-1',
                jti: 'jti-value',
                ipAddress: '127.0.0.1',
                userAgent: session.userAgent,
                geoLocation: null,
                expiredAt: session.expiredAt,
                revokedAt: null,
                isRevoked: false,
                revokedById: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            sessionRepository.createInTx.mockResolvedValue(created);

            const result = await domain.createInTx(
                tx,
                'user-1',
                'session-1',
                'device-ownership-1',
                'jti-value',
                session.expiredAt,
                requestLog
            );

            expect(result).toBe(created);
            expect(sessionRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'device-ownership-1',
                'jti-value',
                session.expiredAt,
                requestLog
            );
        });
    });

    describe('updateJtiInTx', () => {
        it('resolves when the jti update matches a row', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(true);

            await expect(
                domain.updateJtiInTx(tx, 'session-1', 'new-jti')
            ).resolves.toBeUndefined();
        });

        it('throws AuthJwtRefreshTokenInvalidException when no row matched', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(false);

            const rejection = domain.updateJtiInTx(tx, 'session-1', 'new-jti');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });
    });

    describe('revokeInTx', () => {
        it('resolves when the session is revoked', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                domain.revokeInTx(
                    tx,
                    'user-1',
                    'session-1',
                    'admin-1',
                    new Date('2026-01-05T00:00:00.000Z')
                )
            ).resolves.toBeUndefined();
        });

        it('throws SessionNotFoundException when no session matched', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(false);

            const rejection = domain.revokeInTx(
                tx,
                'user-1',
                'session-1',
                'admin-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
        });
    });

    describe('revokeActiveByUserInTx', () => {
        it('delegates to the repository', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await domain.revokeActiveByUserInTx(
                tx,
                'user-1',
                'admin-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(result).toBe(refs);
        });
    });

    describe('revokeByDeviceOwnershipInTx', () => {
        it('delegates to the repository', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(
                refs
            );

            const result = await domain.revokeByDeviceOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(result).toBe(refs);
        });
    });

    describe('revoke', () => {
        it('revokes the session, purges the cache and stages the activity event', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            const event = baseEvent;
            activityLogDomain.prepare.mockReturnValue(event);
            sessionRepository.revoke.mockResolvedValue(true);

            await domain.revoke('user-1', 'session-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionRepository.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(sessionCache.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws SessionNotFoundException without purging or staging when the repository finds nothing to revoke', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            activityLogDomain.prepare.mockReturnValue(baseEvent);
            sessionRepository.revoke.mockResolvedValue(false);

            const rejection = domain.revoke('user-1', 'session-1');

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(sessionCache.deleteLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('revokeByAdmin', () => {
        it('stages one event when the admin revokes their own session', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            const actorMetadata = {
                targetUserId: 'user-1',
                timestamp: revokedAt,
            };
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            const actorEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            };
            activityLogDomain.prepare.mockReturnValue(actorEvent);
            sessionRepository.revokeByAdmin.mockResolvedValue(true);

            await domain.revokeByAdmin('user-1', 'session-1', 'user-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
            ]);
        });

        it('stages an additional target event when the admin revokes another user session', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            const actorMetadata = {
                targetUserId: 'user-1',
                timestamp: revokedAt,
            };
            const targetMetadata = {
                actorUserId: 'admin-1',
                timestamp: revokedAt,
            };
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            sessionUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            const actorEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            };
            const targetEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorEvent)
                .mockReturnValueOnce(targetEvent);
            sessionRepository.revokeByAdmin.mockResolvedValue(true);

            await domain.revokeByAdmin('user-1', 'session-1', 'admin-1');

            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
                targetEvent,
            ]);
        });

        it('throws SessionNotFoundException without purging or staging when the repository finds nothing to revoke', async () => {
            sessionRepository.findOneActive.mockResolvedValue(session);
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue({});
            activityLogDomain.prepare.mockReturnValue(baseEvent);
            sessionRepository.revokeByAdmin.mockResolvedValue(false);

            const rejection = domain.revokeByAdmin(
                'user-1',
                'session-1',
                'user-1'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(sessionCache.deleteLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('purgeRevokedLogins', () => {
        it('deletes exactly the revoked sessions from the cache', async () => {
            await domain.purgeRevokedLogins('user-1', [{ id: 'session-1' }]);

            expect(sessionCache.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
            ]);
        });

        it('swallows a thrown cache purge', async () => {
            sessionCache.deleteLogins.mockRejectedValue(
                new Error('redis down')
            );

            await expect(
                domain.purgeRevokedLogins('user-1', [{ id: 'session-1' }])
            ).resolves.toBeUndefined();
        });
    });

    describe('purgeLoginsByUser', () => {
        it('deletes every login of the user from the cache', async () => {
            await domain.purgeLoginsByUser('user-1');

            expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith(
                'user-1'
            );
        });

        it('swallows a thrown cache purge', async () => {
            sessionCache.deleteLoginsByUser.mockRejectedValue(
                new Error('redis down')
            );

            await expect(
                domain.purgeLoginsByUser('user-1')
            ).resolves.toBeUndefined();
        });
    });

    describe('prepareRevokeAllByAdmin', () => {
        it('returns no events when no session was revoked', () => {
            const result = domain.prepareRevokeAllByAdmin(
                'user-1',
                'admin-1',
                0
            );

            expect(result).toEqual([]);
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
        });

        it('returns one event when the admin revokes their own sessions', () => {
            const event = {
                ...baseEvent,
                action: EnumActivityLogAction.adminSessionRevokeAll,
            };
            activityLogDomain.prepare.mockReturnValue(event);

            const result = domain.prepareRevokeAllByAdmin(
                'user-1',
                'user-1',
                2
            );

            expect(result).toEqual([event]);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: { targetUserId: 'user-1', sessionCount: 2 },
            });
        });

        it('returns two events when an admin revokes another user sessions', () => {
            const adminEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.adminSessionRevokeAll,
            };
            const userEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(adminEvent)
                .mockReturnValueOnce(userEvent);

            const result = domain.prepareRevokeAllByAdmin(
                'user-1',
                'admin-1',
                2
            );

            expect(result).toEqual([adminEvent, userEvent]);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: { actorUserId: 'admin-1', sessionCount: 2 },
            });
        });
    });

    describe('prepareRevokeAllSelf', () => {
        it('prepares the self revoke-all event carrying onError', () => {
            const event = {
                ...baseEvent,
                action: EnumActivityLogAction.userRevokeAllSessions,
                onError: true,
            };
            activityLogDomain.prepare.mockReturnValue(event);

            const result = domain.prepareRevokeAllSelf('user-1', true);

            expect(result).toEqual([event]);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-1',
                createdBy: 'user-1',
                onError: true,
            });
        });
    });

    describe('finalizeRevokeAll', () => {
        it('purges every login of the user and stages the prepared events', async () => {
            const events = [baseEvent];

            await domain.finalizeRevokeAll('user-1', events);

            expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith(
                'user-1'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                events
            );
        });
    });

    describe('revokeAllByAdmin', () => {
        it('throws UserNotSelfException when the admin targets their own account', async () => {
            const rejection = domain.revokeAllByAdmin('user-1', 'user-1');

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notSelf,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notSelf],
                messagePath: 'user.error.notSelf',
            });
            expect(sessionRepository.revokeActiveByUser).not.toHaveBeenCalled();
        });

        it('throws SessionNotFoundException when no session was revoked', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            sessionRepository.revokeActiveByUser.mockResolvedValue([]);

            const rejection = domain.revokeAllByAdmin('user-1', 'admin-1');

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
        });

        it('purges the cache and stages the revoke-all events', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUser.mockResolvedValue(refs);
            const adminEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.adminSessionRevokeAll,
            };
            const userEvent = {
                ...baseEvent,
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(adminEvent)
                .mockReturnValueOnce(userEvent);

            await domain.revokeAllByAdmin('user-1', 'admin-1');

            expect(sessionRepository.revokeActiveByUser).toHaveBeenCalledWith(
                'user-1',
                'admin-1',
                revokedAt
            );
            expect(sessionCache.deleteLoginsByUser).toHaveBeenCalledWith(
                'user-1'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                adminEvent,
                userEvent,
            ]);
        });
    });
});
