import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type {
    IRequestLog,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Duration } from 'luxon';
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
import { DeviceUtil } from '@modules/device/utils/device.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type {
    ISession,
    ISessionList,
    ISessionPurgeLoginsPayload,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionLoginCacheSchema } from '@modules/session/constants/session.constant';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionService } from '@modules/session/services/session.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { SessionUtil } from '@modules/session/utils/session.util';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';

describe('SessionService', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>({
        loginCacheTtlInMs: 900000,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const idleTimeoutInMs = 604800000;
    const retentionInMs = 7776000000;
    const idleDuration = Duration.fromObject({ milliseconds: idleTimeoutInMs });
    const now = new Date('2026-01-08T00:00:00.000Z');
    const idleSince = new Date('2026-01-01T00:00:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');
    const actorEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'actor',
    };
    const targetEffect: IActivityLogCreateManyEffect = {
        ...actorEffect,
        idempotencyKey: 'target',
    };

    let service: SessionService;

    const session: ISession = {
        id: 'session-1',
        userId: 'user-1',
        deviceOwnershipId: 'device-ownership-1',
        jtiDigest: 'jti-digest',
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
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z'),
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
        configGet.mockImplementation(
            key =>
                ({
                    'session.idleTimeoutInMs': idleTimeoutInMs,
                    'session.retentionInMs': retentionInMs,
                })[key]
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(idleSince);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionService,
                { provide: ConfigService, useValue: configService },
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionCache, useValue: sessionCache },
                { provide: CacheService, useValue: cacheService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DeviceService, useValue: deviceService },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionUtil, useValue: sessionUtil },
            ],
        }).compile();
        service = module.get(SessionService);
    });

    describe('isLoginActive', () => {
        const loginKey = 'User:user-1:Session:session-1';
        const matching = { jtiDigest: 'digest-of-jti' };
        const differing = { jtiDigest: 'digest-of-other' };

        beforeEach(() => {
            sessionCache.buildLoginKey.mockReturnValue(loginKey);
            helperHashService.sha256Hash.mockReturnValue('digest-of-jti');
            helperHashService.sha256Compare.mockImplementation(
                (one, two) => one === two
            );
        });

        it('returns false and invalidates the login key when the cached digest differs and the reloaded row differs too', async () => {
            cacheService.readThrough.mockResolvedValue(differing);

            const result = await service.isLoginActive(
                'user-1',
                'session-1',
                'jti'
            );

            expect(result).toBe(false);
            expect(cacheService.invalidate).toHaveBeenCalledWith([loginKey]);
            expect(cacheService.readThrough).toHaveBeenCalledTimes(2);
        });

        it('returns false when the reload after the invalidation finds no live row', async () => {
            cacheService.readThrough
                .mockResolvedValueOnce(differing)
                .mockResolvedValueOnce(null);

            const result = await service.isLoginActive(
                'user-1',
                'session-1',
                'jti'
            );

            expect(result).toBe(false);
            expect(cacheService.invalidate).toHaveBeenCalledWith([loginKey]);
            expect(cacheService.readThrough).toHaveBeenCalledTimes(2);
        });

        it('returns true with one read-through when the cached digest matches', async () => {
            cacheService.readThrough.mockResolvedValue(matching);

            const result = await service.isLoginActive(
                'user-1',
                'session-1',
                'jti'
            );

            expect(result).toBe(true);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('jti');
            expect(cacheService.readThrough).toHaveBeenCalledTimes(1);
            expect(cacheService.invalidate).not.toHaveBeenCalled();
        });

        it('returns true when the reload after the invalidation matches', async () => {
            cacheService.readThrough
                .mockResolvedValueOnce(differing)
                .mockResolvedValueOnce(matching);

            const result = await service.isLoginActive(
                'user-1',
                'session-1',
                'jti'
            );

            expect(result).toBe(true);
            expect(cacheService.invalidate).toHaveBeenCalledWith([loginKey]);
            expect(cacheService.readThrough).toHaveBeenCalledTimes(2);
        });

        it('returns false with no invalidation when no live row loads', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            const result = await service.isLoginActive(
                'user-1',
                'session-1',
                'jti'
            );

            expect(result).toBe(false);
            expect(cacheService.readThrough).toHaveBeenCalledTimes(1);
            expect(cacheService.invalidate).not.toHaveBeenCalled();
        });

        it('reads through the login key, schema, and TTL with the repository read as the loader', async () => {
            sessionRepository.findLoginById.mockResolvedValue(matching);
            cacheService.readThrough.mockImplementation(
                async (_key, _schema, _ttl, loader) => loader()
            );

            await service.isLoginActive('user-1', 'session-1', 'jti');

            expect(sessionCache.buildLoginKey).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                loginKey,
                SessionLoginCacheSchema,
                900000,
                expect.any(Function)
            );
            expect(configGet).toHaveBeenCalledWith('session.idleTimeoutInMs');
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
            expect(sessionRepository.findLoginById).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                idleSince
            );
        });

        it('rethrows a cache failure', async () => {
            const failure = new RedisUnavailableException();
            cacheService.readThrough.mockRejectedValue(failure);

            await expect(
                service.isLoginActive('user-1', 'session-1', 'jti')
            ).rejects.toBe(failure);
        });
    });

    describe('purgeExpired', () => {
        it('deletes the sessions expired before now minus the retention and returns the count', async () => {
            const retention = Duration.fromObject({
                milliseconds: retentionInMs,
            });
            const threshold = new Date('2025-10-10T00:00:00.000Z');
            helperDateService.createDuration.mockReturnValue(retention);
            helperDateService.backward.mockReturnValue(threshold);
            sessionRepository.deleteExpiredBefore.mockResolvedValue(4);

            await expect(service.purgeExpired()).resolves.toBe(4);

            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: retentionInMs,
            });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                retention
            );
            expect(sessionRepository.deleteExpiredBefore).toHaveBeenCalledWith(
                threshold
            );
        });
    });

    describe('deleteLogins', () => {
        it('invalidates the login key of each given session', async () => {
            sessionCache.buildLoginKey
                .mockReturnValueOnce('key-1')
                .mockReturnValueOnce('key-2');

            await service.deleteLogins('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            expect(sessionCache.buildLoginKey).toHaveBeenNthCalledWith(
                1,
                'user-1',
                'session-1'
            );
            expect(sessionCache.buildLoginKey).toHaveBeenNthCalledWith(
                2,
                'user-1',
                'session-2'
            );
            expect(cacheService.invalidate).toHaveBeenCalledWith([
                'key-1',
                'key-2',
            ]);
        });

        it('rethrows the cache failure', async () => {
            const failure = new RedisUnavailableException();
            sessionCache.buildLoginKey.mockReturnValue('key-1');
            cacheService.invalidate.mockRejectedValue(failure);

            const rejection = service.deleteLogins('user-1', [
                { id: 'session-1' },
            ]);

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository with the pagination params and revoked filter', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
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
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
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
            const pagination: IPaginationQueryCursorParams = {
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
            ).toHaveBeenCalledWith('user-1', pagination, idleSince);
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });
    });

    describe('createInTx', () => {
        it('hashes the jti and passes only the digest to the repository', async () => {
            const requestLog: IRequestLog = {
                userAgent: session.userAgent as unknown as IRequestUserAgent,
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            const created: Session = {
                id: 'session-1',
                userId: 'user-1',
                deviceOwnershipId: 'device-ownership-1',
                jtiDigest: 'jti-digest',
                ipAddress: '127.0.0.1',
                userAgent: session.userAgent,
                geoLocation: null,
                expiredAt: session.expiredAt,
                lastActiveAt: session.lastActiveAt,
                revokedAt: null,
                isRevoked: false,
                revokedById: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            sessionRepository.createInTx.mockResolvedValue(created);
            helperHashService.sha256Hash.mockReturnValue('jti-digest');

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
                'jti-digest',
                session.expiredAt,
                requestLog
            );
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'jti-value'
            );
        });
    });

    describe('updateJtiInTx', () => {
        beforeEach(() => {
            helperHashService.sha256Hash.mockImplementation(
                value => `digest-of-${value}`
            );
        });

        it('answers true and passes only the digests to the repository when the compare-and-set matches a row', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(true);

            await expect(
                service.updateJtiInTx(tx, 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(true);
            expect(sessionRepository.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-1',
                'digest-of-old-jti',
                'digest-of-new-jti',
                idleSince
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });

        it('answers false when no row matched the old jti', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(false);

            await expect(
                service.updateJtiInTx(tx, 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(false);
        });
    });

    describe('revokeReusedInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        it('answers true and adds the purge row on the given tx when the live revoke hit a row', async () => {
            sessionRepository.revokeLiveInTx.mockResolvedValue(true);

            await expect(
                service.revokeReusedInTx(
                    tx,
                    'user-1',
                    'session-1',
                    'user-1',
                    revokedAt
                )
            ).resolves.toBe(true);

            expect(helperDateService.backward).toHaveBeenCalledWith(
                revokedAt,
                idleDuration
            );
            expect(sessionRepository.revokeLiveInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt,
                idleSince
            );
            expect(sessionRepository.revokeInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('answers false and adds no row when no live session matched', async () => {
            sessionRepository.revokeLiveInTx.mockResolvedValue(false);

            await expect(
                service.revokeReusedInTx(
                    tx,
                    'user-1',
                    'session-1',
                    'user-1',
                    revokedAt
                )
            ).resolves.toBe(false);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('getRefreshedTokens', () => {
        const tokens: IAuthToken = {
            tokenType: 'Bearer',
            roleKey: EnumRolePlatformKey.user,
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
            ).toHaveBeenCalledWith(tx, 'user-1', null, 'admin-1', revokedAt);
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

    describe('revokeActiveByUserExceptInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        it('revokes all but the excepted session on the given tx, adds the purge row on it, and returns the refs', async () => {
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

            const result = await service.revokeActiveByUserExceptInTx(
                tx,
                'user-1',
                'session-keep',
                'user-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-keep',
                'user-1',
                revokedAt
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.dispatch).not.toHaveBeenCalled();
        });

        it('adds no row when no other session was revoked', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([]);

            const result = await service.revokeActiveByUserExceptInTx(
                tx,
                'user-1',
                'session-keep',
                'user-1',
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
            ).toHaveBeenCalledWith(tx, 'user-1', null, 'admin-1', revokedAt);
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevoke,
                    metadata: {
                        targetUserId: 'user-1',
                        targetUsername: 'jane',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRevokeSessionByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: {
                        actorUserId: 'admin-1',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                }
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
                requestContext,
                apiKeyContext,
                authContext,
                'admin-1',
                'session-1',
                revokedAt
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(2);
        });

        it('returns the session the guarded revoke wrote and adds its purge row on one outbox tx', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(session);

            const result = await service.revokeByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    'session-1',
                    revokedAt
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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    'session-1',
                    revokedAt
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );

            expect(
                sessionUtil.mapActivityLogRevokeAllActorMetadata
            ).toHaveBeenCalledWith('user-1', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('admin-1', 2);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevokeAll,
                    metadata: { targetUserId: 'user-1', sessionCount: 2 },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: { actorUserId: 'admin-1', sessionCount: 2 },
                }
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', null, 'admin-1', revokedAt);
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    revokedAt
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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    revokedAt
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('removeDeviceOwnershipInTx', () => {
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

        it('revokes the ownership sessions with their purge row, then removes the ownership under the scope predicate, on the given tx', async () => {
            const additionalWhere = { userId: 'user-1' };
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

            await expect(
                service.removeDeviceOwnershipInTx(
                    tx,
                    'user-1',
                    'device-ownership-1',
                    'user-1',
                    now,
                    additionalWhere
                )
            ).resolves.toEqual({ deviceOwnership, revokedSessions });

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
                now,
                additionalWhere
            );
            expect(calls).toEqual(['revokeSessions', 'removeOwnership']);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: { userId: 'user-1', sessions: revokedSessions },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });

        it('adds no purge row when the ownership has no live session', async () => {
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            deviceService.removeOwnershipInTx.mockResolvedValue(
                deviceOwnership
            );

            await expect(
                service.removeDeviceOwnershipInTx(
                    tx,
                    'user-1',
                    'device-ownership-1',
                    'user-1',
                    now,
                    null
                )
            ).resolves.toEqual({ deviceOwnership, revokedSessions: [] });

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('removeDeviceOwnershipByAdmin', () => {
        const additionalWhere = { userId: 'user-1' };
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
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-1',
            });
            deviceUtil.mapActivityLogTargetMetadata.mockReturnValue({
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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'device-ownership-1',
                additionalWhere
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
                now,
                additionalWhere
            );
        });

        it('adds the actor and target entries on the same tx when the admin removes another user device', async () => {
            await service.removeDeviceOwnershipByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'device-ownership-1',
                additionalWhere
            );

            expect(deviceUtil.mapActivityLogActorMetadata).toHaveBeenCalledWith(
                deviceOwnership,
                1
            );
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(deviceOwnership, 'admin-1', 1);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminDeviceRemove,
                    metadata: { targetUserId: 'user-1' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: { actorUserId: 'admin-1' },
                }
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
                requestContext,
                apiKeyContext,
                authContext,
                'admin-1',
                'device-ownership-1',
                additionalWhere
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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    'device-ownership-1',
                    additionalWhere
                )
            ).rejects.toMatchObject({
                statusCode: EnumDeviceStatusCodeError.notFound,

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
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    'device-ownership-1',
                    additionalWhere
                )
            ).rejects.toBe(notFound);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.removeDeviceOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'user-1',
                    'device-ownership-1',
                    additionalWhere
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
