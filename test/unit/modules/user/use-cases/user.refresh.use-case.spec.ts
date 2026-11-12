import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
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
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    expectSessionRevoked,
    stubUserRefreshSession,
} from '@test/unit/helpers/test.unit.user-refresh.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user-refresh.helper';
import { UserRefreshUseCase } from '@modules/user/use-cases/user.refresh.use-case';
import { buildRequestContextUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserRefreshUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
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
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const entryEffect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
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
    const context = buildRequestContextUser(baseUser);
    const { requestLog } = context.snapshot;
    const committedUser: IUser = { ...baseUser, twoFactor };
    beforeEach(async () => {
        vi.resetAllMocks();

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        activityLogService.recordEffect.mockReturnValue(entryEffect);
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
                { provide: OutboxService, useValue: outboxService },
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

        it('rotates the session by compare-and-set, stamps the login, adds the refresh entry on the same tx, and rotates the cached entry in order', async () => {
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
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(context, 'refresh-token')
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                context.snapshot,
                { action: EnumActivityLogAction.userRefreshToken }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                tokens
            );
            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'addInTx',
                'updateLogin',
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
                useCase.execute(context, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'new-jti'
            );
            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtService.payloadToken.mockReturnValue(payload);
            authJwtService.getRefreshJti.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException();
            });

            await expect(
                useCase.execute(context, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('answers revoked when the jti compare-and-set matches no row of an already revoked session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue();

            await expectSessionRevoked(
                useCase.execute(context, 'refresh-token')
            );

            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                context.snapshot,
                'user-bramble',
                'session-bramble'
            );
            expect(sessionService.updateLogin).not.toHaveBeenCalled();
        });

        it('revokes the session with the passed snapshot after the commit and answers revoked when the jti compare-and-set matches no row', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeIfActive.mockResolvedValue();
            const callOrder: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionService.revokeIfActive.mockImplementation(async () => {
                callOrder.push('revokeIfActive');
            });

            await expectSessionRevoked(
                useCase.execute(context, 'refresh-token')
            );

            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                context.snapshot,
                'user-bramble',
                'session-bramble'
            );
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
            expect(userService.updateLoginInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(sessionService.updateLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual(['committed', 'revokeIfActive']);
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
            sessionService.revokeIfActive.mockResolvedValue();

            await expectSessionRevoked(
                useCase.execute(context, 'refresh-token')
            );
            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                context.snapshot,
                'user-bramble',
                'session-bramble'
            );
            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
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
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expectSessionRevoked(
                useCase.execute(context, 'refresh-token')
            );

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
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
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(context, 'refresh-token')
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while rotating the session in the unknown exception', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(context, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });
    });
});
