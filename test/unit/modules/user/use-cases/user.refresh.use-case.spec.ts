import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { DeviceService } from '@modules/device/services/device.service';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    expectSessionRevoked,
    stubUserRefreshSession,
} from '@test/unit/helpers/test.unit.user-refresh.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user-refresh.helper';
import { UserRefreshUseCase } from '@modules/user/use-cases/user.refresh.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtRefreshContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('UserRefreshUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
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
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const baseUser: IUser = buildUser('user-bramble', 'bramble@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(baseUser);
    const authContext = {
        ...buildAuthJwtRefreshContext(baseUser.id, 'refresh-token'),
        sessionId: 'session-bramble',
        deviceOwnershipId: 'device-ownership-bramble',
    };
    const { requestLog } = requestContext;
    const committedUser: IUser = baseUser;
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        vi.setSystemTime(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        authJwtService.createTokens.mockReturnValue(tokens);
        Object.defineProperty(authJwtService, 'refreshTokenExpiresInSeconds', {
            value: 2592000,
            configurable: true,
        });
        userService.createManyInTx.mockResolvedValue([committedUser]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRefreshUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                { provide: AuthJwtService, useValue: authJwtService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                HelperDateService,
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

        it('rotates the session, stamps the login, and adds the refresh entry on the same tx in order', async () => {
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
            deviceService.touchOwnershipInTx.mockImplementation(async () => {
                callOrder.push('touchOwnershipInTx');
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            ).resolves.toEqual({ data: tokens });

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userRefreshToken }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                tokens
            );
            expect(sessionService.revokeReusedInTx).not.toHaveBeenCalled();
            expect(deviceService.touchOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                now
            );
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'touchOwnershipInTx',
                'addInTx',
            ]);
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtService.payloadToken.mockReturnValue(payload);
            authJwtService.getRefreshJti.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
            });
        });

        it('revokes the session and adds the revoke entry on the same tx, then answers revoked, when the rotation matches no row', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeReusedInTx.mockResolvedValue(true);

            await expectSessionRevoked(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionService.revokeReusedInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'user-bramble',
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userRevokeSession }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
            expect(userService.updateLoginInTx).not.toHaveBeenCalled();
            expect(deviceService.touchOwnershipInTx).not.toHaveBeenCalled();
        });

        it('adds no entry and answers revoked when the rotation matches no row of a revoked, expired, or idle session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionService.updateJtiInTx.mockResolvedValue(false);
            sessionService.revokeReusedInTx.mockResolvedValue(false);

            await expectSessionRevoked(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            );

            expect(sessionService.revokeReusedInTx).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
        });

        it('answers SessionRevokedException on a write conflict', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionService.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            const conflict = buildPrismaKnownRequestError('P2034');
            outboxService.withTransaction.mockRejectedValue(conflict);

            await expectSessionRevoked(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            );

            expect(sessionService.getRefreshedTokens).toHaveBeenCalledWith(
                null
            );
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
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            ).rejects.toBe(failure);
        });

        it('wraps any other failure raised while rotating the session in the unknown exception', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });
    });
});
