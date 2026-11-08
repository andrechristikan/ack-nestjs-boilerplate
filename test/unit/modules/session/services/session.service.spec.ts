import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import {
    EnumDevicePlatform,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Session } from '@generated/prisma-client/client';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
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

describe('SessionService', () => {
    const sessionRepository: MockProxy<SessionRepository> =
        mock<SessionRepository>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
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
        it('revokes the session as its own user and returns the revoked ref', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            sessionRepository.revoke.mockResolvedValue(true);

            const result = await service.revokeIfActive('user-1', 'session-1');

            expect(result).toEqual([{ id: 'session-1' }]);
            expect(sessionRepository.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
        });

        it('returns no ref when the session was already revoked', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            sessionRepository.revoke.mockResolvedValue(false);

            const result = await service.revokeIfActive('user-1', 'session-1');

            expect(result).toEqual([]);
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

    describe('getRequestLog', () => {
        const requestLog: IRequestLog = {
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
        };

        it('returns the request log of the current request', () => {
            requestStoreService.get.mockReturnValue(requestLog);

            expect(service.getRequestLog()).toBe(requestLog);
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestLogStoreKey
            );
        });

        it('throws RequestContextMissingException when the store holds no request log', () => {
            requestStoreService.get.mockReturnValue(null);

            expect(() => service.getRequestLog()).toThrow(
                expect.objectContaining({
                    module: 'request',
                    statusCode: EnumRequestStatusCodeError.contextMissing,
                    messagePath: 'request.error.contextMissing',
                })
            );
        });
    });

    describe('revokeInTx', () => {
        it('resolves when the session is revoked', async () => {
            sessionRepository.revokeInTx.mockResolvedValue(true);

            await expect(
                service.revokeInTx(
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
        });
    });

    describe('revokeActiveByUserInTx', () => {
        it('delegates to the repository', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeActiveByUserInTx(
                tx,
                'user-1',
                'admin-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(result).toBe(refs);
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

        it('returns the revoked session refs', async () => {
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUserInTx.mockResolvedValue(refs);

            const result = await service.revokeAllByUserInTx(
                tx,
                'user-1',
                'admin-1',
                revokedAt
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

            const result = await service.revokeByDeviceOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                new Date('2026-01-05T00:00:00.000Z')
            );

            expect(result).toBe(refs);
        });
    });

    describe('revokeByDeviceOwnershipIdsInTx', () => {
        it('revokes on the caller transaction and returns the refs grouped per user', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            const rows: ISessionUserRef[] = [
                { id: 'session-2', userId: 'user-2' },
                { id: 'session-3', userId: 'user-2' },
            ];
            const grouped: ISessionPurgeLoginsPayload[] = [
                {
                    userId: 'user-2',
                    sessions: [{ id: 'session-2' }, { id: 'session-3' }],
                },
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
        });
    });

    describe('revoke', () => {
        it('revokes the session as its own user without reading it first', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            helperDateService.create.mockReturnValue(revokedAt);
            sessionRepository.revoke.mockResolvedValue(true);

            await service.revoke('user-1', 'session-1');

            expect(sessionRepository.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
        });

        it('throws SessionNotFoundException when the guarded revoke matches no active session', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            sessionRepository.revoke.mockResolvedValue(false);

            const rejection = service.revoke('user-1', 'session-1');

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

    describe('revokeByAdmin', () => {
        it('returns the session the guarded revoke wrote, without reading it first', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            sessionRepository.revokeByAdmin.mockResolvedValue(session);

            const result = await service.revokeByAdmin(
                'user-1',
                'session-1',
                'admin-1',
                revokedAt
            );

            expect(result).toBe(session);
            expect(sessionRepository.revokeByAdmin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'admin-1',
                revokedAt
            );
        });

        it('throws SessionNotFoundException when the guarded revoke matches no active session', async () => {
            sessionRepository.revokeByAdmin.mockResolvedValue(null);

            const rejection = service.revokeByAdmin(
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
        it('revokes every active session of the user and returns the revoked refs', async () => {
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            const refs: ISessionRef[] = [{ id: 'session-1' }];
            sessionRepository.revokeActiveByUser.mockResolvedValue(refs);

            const result = await service.revokeAllByAdmin(
                'user-1',
                'admin-1',
                revokedAt
            );

            expect(result).toBe(refs);
            expect(sessionRepository.revokeActiveByUser).toHaveBeenCalledWith(
                'user-1',
                'admin-1',
                revokedAt
            );
        });

        it('throws SessionNotFoundException when no session was revoked', async () => {
            sessionRepository.revokeActiveByUser.mockResolvedValue([]);

            const rejection = service.revokeAllByAdmin(
                'user-1',
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

    describe('setLoginOrRevoke', () => {
        const refs: ISessionRef[] = [{ id: 'session-1' }];

        it('stores the login entry and revokes nothing', async () => {
            sessionCache.setLogin.mockResolvedValue();
            sessionRepository.existsActiveById.mockResolvedValue(true);

            await service.setLoginOrRevoke('user-1', 'session-1', 'jti-1');

            expect(sessionCache.setLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'jti-1'
            );
            expect(sessionRepository.revoke).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('revokes the session, enqueues its purge, and rethrows the AppBaseException when the store write fails', async () => {
            const failure = new RedisUnavailableException();
            const revokedAt = new Date('2026-01-05T00:00:00.000Z');
            sessionCache.setLogin.mockRejectedValue(failure);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionRepository.revoke.mockResolvedValue(true);

            await expect(
                service.setLoginOrRevoke('user-1', 'session-1', 'jti-1')
            ).rejects.toBe(failure);

            expect(sessionRepository.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                refs
            );
        });

        it('wraps any other store failure in AppUnknownException after the revoke and purge', async () => {
            const failure = new Error('cache exploded');
            sessionCache.setLogin.mockRejectedValue(failure);
            helperDateService.create.mockReturnValue(
                new Date('2026-01-05T00:00:00.000Z')
            );
            sessionRepository.revoke.mockResolvedValue(true);

            await expect(
                service.setLoginOrRevoke('user-1', 'session-1', 'jti-1')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                refs
            );
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
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('revokes the ownership sessions, then removes the ownership, on one tx', async () => {
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
                'admin-1'
            );

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
            expect(calls).toEqual(['revokeSessions', 'removeOwnership']);
        });

        it('returns the ownership and the revoked sessions', async () => {
            sessionRepository.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceService.removeOwnershipInTx.mockResolvedValue(
                deviceOwnership
            );

            const result = await service.removeDeviceOwnership(
                'user-1',
                'device-ownership-1',
                'user-1'
            );

            expect(result).toEqual({ deviceOwnership, revokedSessions });
        });

        it('throws DeviceNotFoundException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.removeDeviceOwnership(
                    'user-1',
                    'device-ownership-1',
                    'user-1'
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
                    'user-1'
                )
            ).rejects.toBe(notFound);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.removeDeviceOwnership(
                    'user-1',
                    'device-ownership-1',
                    'user-1'
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

            const result = service.mapActivityLogActorMetadata(
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

            const result = service.mapActivityLogTargetMetadata(
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
