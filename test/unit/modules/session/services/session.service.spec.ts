import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import {
    EnumSessionCacheUpdate,
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type {
    ISession,
    ISessionCache,
    ISessionList,
    ISessionPurgeLoginsPayload,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionService } from '@modules/session/services/session.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { SessionUtil } from '@modules/session/utils/session.util';

describe('SessionService', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const context: IRequestContext = {
        actorUserId: 'admin-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    const actorEffect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'actor',
    };
    const targetEffect: IOutboxEffect = {
        ...actorEffect,
        idempotencyKey: 'target',
    };

    let service: SessionService;

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

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionService,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionCache, useValue: sessionCache },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DeviceService, useValue: deviceService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionUtil, useValue: sessionUtil },
            ],
        }).compile();
        service = module.get(SessionService);
    });

    describe('deleteLogins', () => {
        it('deletes exactly the given session logins from the cache', async () => {
            const sessions: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];

            await service.deleteLogins('user-1', sessions);

            expect(sessionCache.deleteLogins).toHaveBeenCalledWith(
                'user-1',
                sessions
            );
        });

        it('rethrows the cache failure', async () => {
            const failure = new Error('redis down');
            sessionCache.deleteLogins.mockRejectedValue(failure);

            const rejection = service.deleteLogins('user-1', [
                { id: 'session-1' },
            ]);

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('getLogin', () => {
        it('reads the login entry from the cache', async () => {
            const login: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                jtiDigest: 'jti-digest',
            };
            sessionCache.getLogin.mockResolvedValue(login);

            const result = await service.getLogin('user-1', 'session-1');

            expect(result).toBe(login);
            expect(sessionCache.getLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
        });

        it('returns null when no login is cached', async () => {
            sessionCache.getLogin.mockResolvedValue(null);

            expect(await service.getLogin('user-1', 'session-1')).toBeNull();
        });

        it('rethrows the cache failure', async () => {
            const failure = new Error('redis down');
            sessionCache.getLogin.mockRejectedValue(failure);

            await expect(service.getLogin('user-1', 'session-1')).rejects.toBe(
                failure
            );
        });
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

            const result = await service.getListOffsetByAdmin(
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

            const result = await service.getListOffsetByAdmin(
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
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    limit: 20,
                    orderBy: [],
                };
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            sessionRepository.findActiveWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListCursor('user-1', pagination);

            expect(result).toBe(paginationResult);
            expect(
                sessionRepository.findActiveWithPaginationCursor
            ).toHaveBeenCalledWith('user-1', pagination);
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

            const result = await service.createInTx(
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
        it('answers true when the compare-and-set matches a row', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(true);

            await expect(
                service.updateJtiInTx(tx, 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(true);
            expect(sessionRepository.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-1',
                'old-jti',
                'new-jti'
            );
        });

        it('answers false when no row matched the old jti', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(false);

            await expect(
                service.updateJtiInTx(tx, 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(false);
        });
    });

    describe('setLogin', () => {
        it('stores the login entry in the cache and keeps it while the session row is live', async () => {
            sessionRepository.existsActiveById.mockResolvedValue(true);

            await service.setLogin('user-1', 'session-1', 'jti-value');

            expect(sessionCache.setLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'jti-value'
            );
            expect(sessionRepository.existsActiveById).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
            expect(sessionCache.setLogin).toHaveBeenCalledBefore(
                sessionRepository.existsActiveById
            );
            expect(sessionCache.deleteLogins).not.toHaveBeenCalled();
        });

        it('deletes the entry when the session row was revoked before the entry landed', async () => {
            sessionRepository.existsActiveById.mockResolvedValue(false);

            await service.setLogin('user-1', 'session-1', 'jti-value');

            expect(sessionCache.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
            ]);
        });

        it('rethrows the cache failure', async () => {
            const failure = new Error('redis down');
            sessionCache.setLogin.mockRejectedValue(failure);

            await expect(
                service.setLogin('user-1', 'session-1', 'jti-value')
            ).rejects.toBe(failure);
            expect(sessionRepository.existsActiveById).not.toHaveBeenCalled();
        });
    });

    describe('updateLogin', () => {
        it('answers the compare-and-set outcome of the cache', async () => {
            sessionCache.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.mismatch
            );

            await expect(
                service.updateLogin('user-1', 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(EnumSessionCacheUpdate.mismatch);
            expect(sessionCache.updateLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );
        });
    });

    describe('revokeIfActive', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(revokedAt);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('revokes the session as its own user with its purge row on one outbox tx', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                service.revokeIfActive('user-1', 'session-1', null)
            ).resolves.toBeUndefined();

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('adds no entry when no context is given', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await service.revokeIfActive('user-1', 'session-1', null);

            expect(activityLogService.recordEffect).not.toHaveBeenCalled();
        });

        it('adds the userRevokeSession entry from the passed context after the purge row on the same tx', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);
            activityLogService.recordEffect.mockReturnValue(actorEffect);

            await service.revokeIfActive('user-1', 'session-1', context);

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.userRevokeSession },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(2);
            expect(outboxService.addInTx).toHaveBeenLastCalledWith(
                tx,
                actorEffect
            );
        });

        it('adds no row when the session was already revoked', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(false);

            await expect(
                service.revokeIfActive('user-1', 'session-1', null)
            ).resolves.toBeUndefined();

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('resolves on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.revokeIfActive('user-1', 'session-1', null)
            ).resolves.toBeUndefined();

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const failure = new RedisUnavailableException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.revokeIfActive('user-1', 'session-1', null)
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.revokeIfActive('user-1', 'session-1', null)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('getRefreshedTokens', () => {
        const tokens: IAuthToken = {
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        it('returns the tokens of a rotated refresh', () => {
            expect(service.getRefreshedTokens(tokens)).toBe(tokens);
        });

        it('throws SessionRevokedException for a replayed refresh', () => {
            expect(() => service.getRefreshedTokens(null)).toThrow(
                expect.objectContaining({
                    module: 'session',
                    statusCode: EnumSessionStatusCodeError.revoked,
                    messagePath: 'session.error.revoked',
                })
            );
        });
    });

    describe('revokeInTx', () => {
        it('revokes the session and adds its purge row on the given tx', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            const effect: IOutboxEffect = {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            };
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                service.revokeInTx(
                    tx,
                    'user-1',
                    'session-1',
                    'admin-1',
                    revokedAt
                )
            ).resolves.toBeUndefined();

            expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'admin-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('throws SessionNotFoundException when no session matched', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(false);

            const rejection = service.revokeInTx(
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
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('revokeActiveByUserInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        it('revokes on the given tx, adds the purge row on it, and returns the refs', async () => {
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            const effect: IOutboxEffect = {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: refs },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            };
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeActiveByUserInTx(
                tx,
                'user-1',
                'admin-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', revokedAt);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.dispatch).not.toHaveBeenCalled();
        });

        it('adds no row when no session was revoked', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([]);

            const result = await service.revokeActiveByUserInTx(
                tx,
                'user-1',
                'admin-1',
                revokedAt
            );

            expect(result).toEqual([]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByUserInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        it('revokes the active sessions, then every device ownership, on the given tx', async () => {
            const order: string[] = [];
            sessionRepository.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    order.push('sessions');

                    return [{ id: 'session-1' }];
                }
            );
            deviceService.revokeAllByUserInTx.mockImplementation(async () => {
                order.push('devices');
            });

            await service.revokeAllByUserInTx(
                tx,
                'user-1',
                'admin-1',
                revokedAt
            );

            expect(order).toEqual(['sessions', 'devices']);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', revokedAt);
            expect(deviceService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'admin-1',
                revokedAt
            );
        });

        it('returns the revoked session refs and adds exactly one purge row for the user', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeAllByUserInTx(
                tx,
                'user-1',
                'admin-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: refs },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });

    describe('revokeByDeviceOwnershipInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        it('revokes on the given tx, adds the purge row on it, and returns the refs', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(
                refs
            );

            const result = await service.revokeByDeviceOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(
                sessionRepository.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: refs },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('adds no row when no session was revoked', async () => {
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue([]);

            await service.revokeByDeviceOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                revokedAt
            );

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('revokeByDeviceOwnershipIdsInTx', () => {
        it('revokes on the caller transaction and returns the refs grouped per user', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            const rows: ISessionUserRef[] = [
                { id: 'session-2', userId: 'user-2' },
                { id: 'session-3', userId: 'user-2' },
                { id: 'session-4', userId: 'user-3' },
            ];
            const grouped: ISessionPurgeLoginsPayload[] = [
                {
                    userId: 'user-2',
                    sessions: [{ id: 'session-2' }, { id: 'session-3' }],
                },
                { userId: 'user-3', sessions: [{ id: 'session-4' }] },
            ];
            sessionRepository.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                rows
            );

            const result = await service.revokeByDeviceOwnershipIdsInTx(
                tx,
                ['device-ownership-2'],
                'user-1',
                revokedAt
            );

            expect(
                sessionRepository.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-ownership-2'],
                'user-1',
                new Date('2026-01-05T00:00:00.000Z')
            );
            expect(result).toEqual(grouped);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumSessionQueue.session,
                    name: EnumSessionProcess.purgeLogins,
                    data: {
                        userId: 'user-2',
                        sessions: [{ id: 'session-2' }, { id: 'session-3' }],
                    },
                    priority: EnumQueuePriority.high,
                    idempotencyKey: null,
                },
                {
                    queue: EnumSessionQueue.session,
                    name: EnumSessionProcess.purgeLogins,
                    data: { userId: 'user-3', sessions: [{ id: 'session-4' }] },
                    priority: EnumQueuePriority.high,
                    idempotencyKey: null,
                },
            ]);
        });

        it('adds no row when no session was revoked', async () => {
            sessionRepository.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                []
            );

            const result = await service.revokeByDeviceOwnershipIdsInTx(
                tx,
                ['device-ownership-2'],
                'user-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(result).toEqual([]);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('revoke', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(revokedAt);
            activityLogService.recordEffect.mockReturnValue(actorEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('adds the userRevokeSession entry from the passed context on the same tx after the purge row', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await service.revoke('user-1', 'session-1', context);

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.userRevokeSession },
                context
            );
            expect(outboxService.addInTx).toHaveBeenLastCalledWith(
                tx,
                actorEffect
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(2);
        });

        it('revokes the session as its own user and adds its purge row on one outbox tx', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await service.revoke('user-1', 'session-1', context);

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('throws SessionNotFoundException when the guarded revoke matches no active session', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(false);

            const rejection = service.revoke('user-1', 'session-1', context);

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws SessionNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.revoke('user-1', 'session-1', context)
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.revoke('user-1', 'session-1', context)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('revokeByAdmin', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            activityLogService.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('adds the actor and target entries on the same tx after the purge row when the admin targets another user', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(session);

            await service.revokeByAdmin(
                'user-1',
                'session-1',
                'admin-1',
                revokedAt,
                context
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                {
                    action: EnumActivityLogAction.adminSessionRevoke,
                    metadata: {
                        targetUserId: 'user-1',
                        targetUsername: 'jane',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                },
                context
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                {
                    action: EnumActivityLogAction.userRevokeSessionByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: {
                        actorUserId: 'admin-1',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                },
                context
            );
            expect(outboxService.addInTx).toHaveBeenNthCalledWith(
                2,
                tx,
                actorEffect
            );
            expect(outboxService.addInTx).toHaveBeenNthCalledWith(
                3,
                tx,
                targetEffect
            );
        });

        it('adds only the actor entry when the admin revokes their own session', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue({
                ...session,
                userId: 'admin-1',
            });

            await service.revokeByAdmin(
                'admin-1',
                'session-1',
                'admin-1',
                revokedAt,
                context
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(2);
        });

        it('returns the session the guarded revoke wrote and adds its purge row on one outbox tx', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(session);

            const result = await service.revokeByAdmin(
                'user-1',
                'session-1',
                'admin-1',
                revokedAt,
                context
            );

            expect(result).toBe(session);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionRepository.revokeByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'admin-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('throws SessionNotFoundException and adds no row when the guarded revoke matches no active session', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(null);

            const rejection = service.revokeByAdmin(
                'user-1',
                'session-1',
                'admin-1',
                revokedAt,
                context
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
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws SessionNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.revokeByAdmin(
                    'user-1',
                    'session-1',
                    'admin-1',
                    revokedAt,
                    context
                )
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.revokeByAdmin(
                    'user-1',
                    'session-1',
                    'admin-1',
                    revokedAt,
                    context
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('assertNotSelf', () => {
        it('throws UserNotSelfException when the admin targets their own account', () => {
            expect(() => service.assertNotSelf('user-1', 'user-1')).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.notSelf,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.notSelf
                        ],
                    messagePath: 'user.error.notSelf',
                })
            );
        });

        it('returns when the admin targets another account', () => {
            expect(() =>
                service.assertNotSelf('user-1', 'admin-1')
            ).not.toThrow();
        });
    });

    describe('revokeAllByAdmin', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            sessionUtil.mapActivityLogRevokeAllActorMetadata.mockReturnValue({
                targetUserId: 'user-1',
                sessionCount: 2,
            });
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue({
                actorUserId: 'admin-1',
                sessionCount: 2,
            });
            activityLogService.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('adds the actor and target entries from the revoked count on the same tx after the purge row', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            await service.revokeAllByAdmin(
                'user-1',
                'admin-1',
                revokedAt,
                context
            );

            expect(
                sessionUtil.mapActivityLogRevokeAllActorMetadata
            ).toHaveBeenCalledWith('user-1', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('admin-1', 2);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                {
                    action: EnumActivityLogAction.adminSessionRevokeAll,
                    metadata: { targetUserId: 'user-1', sessionCount: 2 },
                },
                context
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                {
                    action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: { actorUserId: 'admin-1', sessionCount: 2 },
                },
                context
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEffect,
                targetEffect,
            ]);
        });

        it('revokes every active session of the user with one purge row on one outbox tx and returns the revoked refs', async () => {
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeAllByAdmin(
                'user-1',
                'admin-1',
                revokedAt,
                context
            );

            expect(result).toBe(refs);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', revokedAt);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: refs },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('throws SessionNotFoundException and adds no row when no session was revoked', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([]);

            const rejection = service.revokeAllByAdmin(
                'user-1',
                'admin-1',
                revokedAt,
                context
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
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws SessionNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.revokeAllByAdmin(
                    'user-1',
                    'admin-1',
                    revokedAt,
                    context
                )
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.revokeAllByAdmin(
                    'user-1',
                    'admin-1',
                    revokedAt,
                    context
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('setLoginOrRevoke', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(revokedAt);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('stores the login entry and revokes nothing', async () => {
            sessionCache.setLogin.mockResolvedValue();
            sessionRepository.existsActiveById.mockResolvedValue(true);

            await service.setLoginOrRevoke('user-1', 'session-1', 'jti-1');

            expect(sessionCache.setLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'jti-1'
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(sessionRepository.revokeInTx).not.toHaveBeenCalled();
        });

        it('revokes the session with its purge row on one outbox tx and rethrows the AppBaseException when the store write fails', async () => {
            const failure = new RedisUnavailableException();
            sessionCache.setLogin.mockRejectedValue(failure);
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                service.setLoginOrRevoke('user-1', 'session-1', 'jti-1')
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionRepository.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('treats a write conflict on the revoke as a miss and rethrows the store failure', async () => {
            const failure = new RedisUnavailableException();
            sessionCache.setLogin.mockRejectedValue(failure);
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.setLoginOrRevoke('user-1', 'session-1', 'jti-1')
            ).rejects.toBe(failure);
        });

        it('wraps any other store failure in AppUnknownException after the revoke', async () => {
            const failure = new Error('cache exploded');
            sessionCache.setLogin.mockRejectedValue(failure);
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                service.setLoginOrRevoke('user-1', 'session-1', 'jti-1')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });

            expect(sessionRepository.revokeInTx).toHaveBeenCalledTimes(1);
        });
    });

    describe('removeDeviceOwnership', () => {
        const now = new Date('2026-01-05T00:00:00.000Z');
        const revokedSessions: ISessionRef[] = [{ id: 'session-1' }];
        const deviceOwnership: IDeviceOwnership = {
            id: 'device-ownership-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            deviceId: 'device-1',
            userId: 'user-1',
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            lastActiveAt: now,
            notificationToken: null,
            notificationProvider: null,
            biometricEnabled: false,
            biometricToken: null,
            biometricType: null,
            biometricEnabledAt: null,
            device: {
                id: 'device-1',
                createdAt: now,
                createdBy: 'user-1',
                updatedAt: now,
                updatedBy: 'user-1',
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: 'iPhone 12',
                platform: EnumDevicePlatform.ios,
                lastActiveAt: now,
            },
            user: {
                id: 'user-1',
                createdAt: now,
                createdBy: 'user-1',
                updatedAt: now,
                updatedBy: 'user-1',
                deletedAt: null,
                deletedBy: null,
                name: 'Jane Doe',
                username: 'jane',
                photo: null,
            },
            revokedBy: null,
            _count: { sessions: 2 },
        };

        beforeEach(() => {
            helperDateService.create.mockReturnValue(now);
            deviceService.mapActivityLogMetadata.mockReturnValue({
                deviceOwnershipId: 'device-ownership-1',
            });
            activityLogService.recordEffect.mockReturnValue(actorEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('revokes the ownership sessions with their purge row, then removes the ownership, on one outbox tx', async () => {
            const calls: string[] = [];
            sessionRepository.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revokedSessions;
                }
            );
            deviceService.removeOwnershipInTx.mockImplementation(async () => {
                calls.push('removeOwnership');

                return deviceOwnership;
            });

            await service.removeDeviceOwnership(
                'user-1',
                'device-ownership-1',
                context
            );

            expect(
                sessionRepository.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(calls).toEqual(['revokeSessions', 'removeOwnership']);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: revokedSessions },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('adds the userRemoveDevice entry from the removed ownership and the revoked count on the same tx', async () => {
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceService.removeOwnershipInTx.mockResolvedValue(
                deviceOwnership
            );

            await service.removeDeviceOwnership(
                'user-1',
                'device-ownership-1',
                context
            );

            expect(deviceService.mapActivityLogMetadata).toHaveBeenCalledWith(
                deviceOwnership,
                1
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                {
                    action: EnumActivityLogAction.userRemoveDevice,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    metadata: { deviceOwnershipId: 'device-ownership-1' },
                },
                context
            );
            expect(outboxService.addInTx).toHaveBeenLastCalledWith(
                tx,
                actorEffect
            );
        });

        it('throws DeviceNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.removeDeviceOwnership(
                    'user-1',
                    'device-ownership-1',
                    context
                )
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                messagePath: 'device.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const notFound = new DeviceNotFoundException();
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            deviceService.removeOwnershipInTx.mockRejectedValue(notFound);

            await expect(
                service.removeDeviceOwnership(
                    'user-1',
                    'device-ownership-1',
                    context
                )
            ).rejects.toBe(notFound);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.removeDeviceOwnership(
                    'user-1',
                    'device-ownership-1',
                    context
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('removeDeviceOwnershipByAdmin', () => {
        const now = new Date('2026-01-05T00:00:00.000Z');
        const revokedSessions: ISessionRef[] = [{ id: 'session-1' }];
        const deviceOwnership: IDeviceOwnership = {
            id: 'device-ownership-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            deviceId: 'device-1',
            userId: 'user-1',
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            lastActiveAt: now,
            notificationToken: null,
            notificationProvider: null,
            biometricEnabled: false,
            biometricToken: null,
            biometricType: null,
            biometricEnabledAt: null,
            device: {
                id: 'device-1',
                createdAt: now,
                createdBy: 'user-1',
                updatedAt: now,
                updatedBy: 'user-1',
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: 'iPhone 12',
                platform: EnumDevicePlatform.ios,
                lastActiveAt: now,
            },
            user: {
                id: 'user-1',
                createdAt: now,
                createdBy: 'user-1',
                updatedAt: now,
                updatedBy: 'user-1',
                deletedAt: null,
                deletedBy: null,
                name: 'Jane Doe',
                username: 'jane',
                photo: null,
            },
            revokedBy: null,
            _count: { sessions: 2 },
        };

        beforeEach(() => {
            helperDateService.create.mockReturnValue(now);
            deviceService.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-1',
            });
            deviceService.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-1',
            });
            activityLogService.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceService.removeOwnershipInTx.mockResolvedValue(
                deviceOwnership
            );
        });

        it('removes the ownership as the admin with the purge row on one outbox tx', async () => {
            await service.removeDeviceOwnershipByAdmin(
                'user-1',
                'device-ownership-1',
                'admin-1',
                context
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                sessionRepository.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
        });

        it('adds the actor and target entries on the same tx when the admin removes another user device', async () => {
            await service.removeDeviceOwnershipByAdmin(
                'user-1',
                'device-ownership-1',
                'admin-1',
                context
            );

            expect(
                deviceService.mapActivityLogActorMetadata
            ).toHaveBeenCalledWith(deviceOwnership, 1);
            expect(
                deviceService.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(deviceOwnership, 'admin-1', 1);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                {
                    action: EnumActivityLogAction.adminDeviceRemove,
                    metadata: { targetUserId: 'user-1' },
                },
                context
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                {
                    action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: { actorUserId: 'admin-1' },
                },
                context
            );
            expect(outboxService.addInTx).toHaveBeenNthCalledWith(
                2,
                tx,
                actorEffect
            );
            expect(outboxService.addInTx).toHaveBeenNthCalledWith(
                3,
                tx,
                targetEffect
            );
        });

        it('adds only the actor entry when the admin removes their own device', async () => {
            await service.removeDeviceOwnershipByAdmin(
                'admin-1',
                'device-ownership-1',
                'admin-1',
                context
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(2);
        });

        it('throws DeviceNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.removeDeviceOwnershipByAdmin(
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    context
                )
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                messagePath: 'device.error.notFound',
            });
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const notFound = new DeviceNotFoundException();
            deviceService.removeOwnershipInTx.mockRejectedValue(notFound);

            await expect(
                service.removeDeviceOwnershipByAdmin(
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    context
                )
            ).rejects.toBe(notFound);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.removeDeviceOwnershipByAdmin(
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    context
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('mapActivityLogActorMetadata', () => {
        it('maps the session to the actor metadata shape', () => {
            const timestamp = new Date('2026-01-05T00:00:00.000Z');

            const result = service['mapActivityLogActorMetadata'](
                session,
                timestamp
            );

            expect(result).toEqual({
                targetUserId: 'user-1',
                targetUsername: 'jane',
                sessionId: 'session-1',
                timestamp,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('maps the session to the target metadata shape', () => {
            const timestamp = new Date('2026-01-05T00:00:00.000Z');

            const result = service['mapActivityLogTargetMetadata'](
                session,
                'actor-1',
                timestamp
            );

            expect(result).toEqual({
                actorUserId: 'actor-1',
                sessionId: 'session-1',
                timestamp,
            });
        });
    });

    describe('groupRefsByUser', () => {
        it('groups the refs per user in first-seen order, keeping only the id in each ref', () => {
            const sessions: ISessionUserRef[] = [
                { id: 'session-1', userId: 'user-2' },
                { id: 'session-2', userId: 'user-3' },
                { id: 'session-3', userId: 'user-2' },
            ];

            const result = service['groupRefsByUser'](sessions);

            expect(result).toEqual([
                {
                    userId: 'user-2',
                    sessions: [{ id: 'session-1' }, { id: 'session-3' }],
                },
                { userId: 'user-3', sessions: [{ id: 'session-2' }] },
            ]);
        });

        it('returns an empty list for no refs', () => {
            const result = service['groupRefsByUser']([]);

            expect(result).toEqual([]);
        });
    });
});
