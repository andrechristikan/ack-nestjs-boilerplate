import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    expectSessionRevoked,
    stubUserRefreshSession,
} from '@test/unit/helpers/test.unit.user-refresh.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user-refresh.helper';
import { UserRefreshUseCase } from '@modules/user/use-cases/user.refresh.use-case';

describe('UserRefreshUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const refreshSessionDoubles: IUserRefreshSessionDoubles = {
        authJwtService,
        sessionService,
    };
    let useCase: UserRefreshUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-bramble',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionService.getRequestLog.mockReturnValue(requestLog);
        activityLogService.prepare.mockReturnValue(activityLog);
        authJwtService.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtService,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        userService.createManyInTx.mockResolvedValue([committedUser]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRefreshUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserRefreshUseCase);
    });

    describe('execute', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: now,
            userId: 'user-bramble',
            sessionId: 'session-bramble',
            deviceOwnershipId: 'device-ownership-bramble',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        };
        const refreshed: IAuthAccessTokenGenerate = {
            tokens,
            jti: 'new-jti',
            sessionId: 'session-bramble',
        };

        it('rotates the session by compare-and-set, stamps the login, rotates the cached entry, and stages the refresh row in order', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockReturnValue(tokens);
            const callOrder: string[] = [];
            sessionService.updateJtiInTx.mockImplementation(async () => {
                callOrder.push('updateJtiInTx');

                return true;
            });
            userService.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('updateLoginInTx');

                return baseUser;
            });
            sessionService.updateLogin.mockImplementation(async () => {
                callOrder.push('updateLogin');

                return EnumSessionCacheUpdate.updated;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionService.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionService.updateLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRefreshToken,
            });
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                tokens
            );
            expect(sessionService.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'updateLogin',
                'stagePrepared',
            ]);
        });

        it('writes a fresh login entry when the cached one expired with the access token', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockReturnValue(tokens);
            sessionService.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionService.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'new-jti'
            );
            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
        });

        it('revokes the rotated session, purges it, and rethrows when the fresh login entry cannot be written', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );
            const failure = new RedisUnavailableException();
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toBe(failure);

            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
        });

        it('revokes the rotated session, purges it, and wraps a non-app failure when the fresh login entry cannot be written', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );
            const failure = new Error('cache exploded');
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
        });

        it('throws RequestContextMissingException before reading the token when the store has no request log', async () => {
            sessionService.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                messagePath: 'request.error.contextMissing',
            });
            expect(authJwtService.payloadToken).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtService.payloadToken.mockReturnValue(payload);
            authJwtService.getRefreshJti.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException();
            });

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('enqueues an empty purge and answers revoked when the jti compare-and-set matches no row of an already revoked session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue([]);

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(sessionService.updateLogin).not.toHaveBeenCalled();
        });

        it('revokes the session after the commit, purges it, stages the revoke row, and answers revoked when the jti compare-and-set matches no row', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionService.revokeIfActive.mockImplementation(async () => {
                callOrder.push('revokeIfActive');

                return revokedRef;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
            expect(userService.updateLoginInTx).not.toHaveBeenCalled();
            expect(sessionService.updateLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'committed',
                'revokeIfActive',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('revokes the session and answers revoked when the cached jti is not the one presented', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.mismatch
            );
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionService.setLogin).not.toHaveBeenCalled();
        });

        it('stages no reuse row when nothing was revoked', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue([]);

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages the reuse row when a session was revoked', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('answers SessionRevokedException on a write conflict and revokes nothing', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expectSessionRevoked(
                useCase.execute(baseUser, 'refresh-token')
            );

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
            expect(sessionService.updateLogin).not.toHaveBeenCalled();
        });

        it('rethrows an app exception raised while rotating the session unchanged', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new SessionRevokedException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while rotating the session in the unknown exception', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
