import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
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
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type {
    ISession,
    ISessionList,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';
import { CacheService } from '@common/cache/services/cache.service';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionService } from '@modules/session/services/session.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthQueue } from '@modules/user/queues/user.auth.queue';
import type { IUserPurgeLoginsEffect } from '@modules/user/interfaces/user.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { SessionUtil } from '@modules/session/utils/session.util';
import { SessionLoginCacheSchema } from '@modules/session/dtos/session.login-cache.dto';

const JtiDigest =
    '5b1288bdb86ccf33cc0158da1a1f405c4095d9c00fe9dadd9c58af82ff2abae5';
const OtherDigest =
    'd9298a10d1b0735837dc4bd85dac641b0f3cef27a47e5d53a54f2f3f5b2fcffa';
const JtiValueDigest =
    '3fedea99e968dee801b1651295a14d9defbf311119be3a5f5b94e3d798e79aeb';
const OldJtiDigest =
    '9797f85128318ebf067c28910d1b3b3957c987cb0d3ca5975dc9a3969e5f2b94';
const NewJtiDigest =
    '14c219682dd8c50a73aed0ca41c8acca9dcaf334fc73b9646a1022ffb59a4570';

describe('SessionService', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>({
        loginCacheTtlInMs: 900000,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userAuthQueue: MockProxy<UserAuthQueue> = mock<UserAuthQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const idleTimeoutInMs = 604800000;
    const retentionInMs = 7776000000;
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
    const purgeEffect: IUserPurgeLoginsEffect = {
        queue: EnumUserQueue.userAuth,
        name: EnumUserAuthProcess.purgeLogins,
        data: { userId: 'user-1', sessions: [] },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const otherPurgeEffect: IUserPurgeLoginsEffect = {
        ...purgeEffect,
        data: { userId: 'user-2', sessions: [] },
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
        jtiDigest: JtiValueDigest,
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        userAuthQueue.purgeLoginsEffect.mockReturnValue(purgeEffect);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'session.idleTimeoutInMs': idleTimeoutInMs,
                        'session.retentionInMs': retentionInMs,
                    }),
                },
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionCache, useValue: sessionCache },
                { provide: CacheService, useValue: cacheService },
                ...TestUnitKitProviders,
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserAuthQueue, useValue: userAuthQueue },
                SessionUtil,
            ],
        }).compile();
        service = module.get(SessionService);
    });

    describe('isLoginActive', () => {
        const loginKey = 'User:user-1:Session:session-1';
        const matching = { jtiDigest: JtiDigest };
        const differing = { jtiDigest: OtherDigest };

        beforeEach(() => {
            sessionCache.buildLoginKey.mockReturnValue(loginKey);
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
            const threshold = new Date('2025-10-10T00:00:00.000Z');
            sessionRepository.deleteExpiredBefore.mockResolvedValue(4);

            await expect(service.purgeExpired()).resolves.toBe(4);

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
        });
    });

    describe('createInTx', () => {
        it('hashes the jti and passes only the digest to the repository', async () => {
            const requestLog = {
                userAgent: session.userAgent,
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            const created: Session = {
                id: 'session-1',
                userId: 'user-1',
                deviceOwnershipId: 'device-ownership-1',
                jtiDigest: JtiValueDigest,
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
                JtiValueDigest,
                session.expiredAt,
                requestLog
            );
        });
    });

    describe('existsLiveByJti', () => {
        it('answers true and passes only the digest and the idle bound to the repository when a live row holds the jti', async () => {
            sessionRepository.existsLiveByJtiDigest.mockResolvedValue(true);

            await expect(
                service.existsLiveByJti('session-1', 'old-jti')
            ).resolves.toBe(true);
            expect(
                sessionRepository.existsLiveByJtiDigest
            ).toHaveBeenCalledWith('session-1', OldJtiDigest, idleSince);
        });

        it('answers false when no live row holds the jti', async () => {
            sessionRepository.existsLiveByJtiDigest.mockResolvedValue(false);

            await expect(
                service.existsLiveByJti('session-1', 'old-jti')
            ).resolves.toBe(false);
        });
    });

    describe('updateJtiInTx', () => {
        it('answers true and passes only the digests to the repository when the compare-and-set matches a row', async () => {
            sessionRepository.updateJtiInTx.mockResolvedValue(true);

            await expect(
                service.updateJtiInTx(tx, 'session-1', 'old-jti', 'new-jti')
            ).resolves.toBe(true);
            expect(sessionRepository.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-1',
                OldJtiDigest,
                NewJtiDigest,
                idleSince
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
            expect(sessionRepository.revokeLiveInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt,
                new Date('2025-12-29T00:00:00.000Z')
            );
            expect(sessionRepository.revokeInTx).not.toHaveBeenCalled();
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                [{ id: 'session-1' }]
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
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
                })
            );
        });
    });

    describe('revokeInTx', () => {
        it('revokes the session and adds its purge row on the given tx', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
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
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                [{ id: 'session-1' }]
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
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
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
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
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
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
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
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
        it('revokes on the caller transaction and adds one purge effect and one userSessionRevokedByDeviceLogin entry per affected user in one addManyInTx', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            const rows: ISessionUserRef[] = [
                { id: 'session-2', userId: 'user-2' },
                { id: 'session-3', userId: 'user-2' },
                { id: 'session-4', userId: 'user-3' },
            ];
            sessionRepository.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                rows
            );
            userAuthQueue.purgeLoginsEffect
                .mockReturnValueOnce(purgeEffect)
                .mockReturnValueOnce(otherPurgeEffect);
            activityLogQueue.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);

            await service.revokeByDeviceOwnershipIdsInTx(
                tx,
                requestContext,
                apiKeyContext,
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
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenNthCalledWith(
                1,
                'user-2',
                [{ id: 'session-2' }, { id: 'session-3' }]
            );
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenNthCalledWith(
                2,
                'user-3',
                [{ id: 'session-4' }]
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSessionRevokedByDeviceLogin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    metadata: { actorUserId: 'user-1', sessionCount: 2 },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSessionRevokedByDeviceLogin,
                    userId: 'user-3',
                    createdBy: 'user-1',
                    metadata: { actorUserId: 'user-1', sessionCount: 1 },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                purgeEffect,
                actorEffect,
                otherPurgeEffect,
                targetEffect,
            ]);
        });

        it('adds nothing when no session was revoked', async () => {
            sessionRepository.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                []
            );

            await service.revokeByDeviceOwnershipIdsInTx(
                tx,
                requestContext,
                apiKeyContext,
                ['device-ownership-2'],
                'user-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(activityLogQueue.recordEffect).not.toHaveBeenCalled();
        });
    });

    describe('revokeByAdminInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            activityLogQueue.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);
        });

        it('adds the purge effect and both entries in one addManyInTx call when the admin targets another user', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(session);

            await service.revokeByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
            );

            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevoked,
                    metadata: {
                        targetUserId: 'user-1',
                        targetUsername: 'jane',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userSessionRevokedByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: {
                        actorUserId: 'admin-1',
                        sessionId: 'session-1',
                        timestamp: revokedAt,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                purgeEffect,
                actorEffect,
                targetEffect,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds only the actor entry when the admin revokes their own session', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue({
                ...session,
                userId: 'admin-1',
            });

            await service.revokeByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'admin-1',
                'session-1',
                revokedAt
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                purgeEffect,
                actorEffect,
            ]);
        });

        it('returns the session the guarded revoke wrote and adds its purge row', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(session);

            const result = await service.revokeByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
            );

            expect(result).toBe(session);
            expect(sessionRepository.revokeByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'admin-1',
                revokedAt
            );
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                [{ id: 'session-1' }]
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(
                tx,
                expect.arrayContaining([purgeEffect])
            );
        });

        it('throws SessionNotFoundException and adds no row when the guarded revoke matches no active session', async () => {
            sessionRepository.revokeByAdminInTx.mockResolvedValue(null);

            const rejection = service.revokeByAdminInTx(
                tx,
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
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByAdminInTx', () => {
        const revokedAt = new Date('2026-01-05T00:00:00.000Z');

        beforeEach(() => {
            activityLogQueue.recordEffect
                .mockReturnValueOnce(actorEffect)
                .mockReturnValueOnce(targetEffect);
        });

        it('adds the actor and target entries from the revoked count on the same tx after the purge row', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            await service.revokeAllByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );

            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminAllSessionsRevoked,
                    metadata: { targetUserId: 'user-1', sessionCount: 2 },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userAllSessionsRevokedByAdmin,
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

        it('revokes every active session of the user with one purge row and returns the revoked refs', async () => {
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeAllByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(
                sessionRepository.revokeActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', null, 'admin-1', revokedAt);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(userAuthQueue.purgeLoginsEffect).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, purgeEffect);
        });

        it('throws SessionNotFoundException and adds no row when no session was revoked', async () => {
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue([]);

            const rejection = service.revokeAllByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
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
