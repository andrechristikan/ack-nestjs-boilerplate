import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { UserDisableTwoFactorUseCase } from '@modules/user/use-cases/user.disable-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserDisableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserDisableTwoFactorUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const check: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: {
            verified: {
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            },
            totpStep: 58123456,
        },
        verificationId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(check);
        sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDisableTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: SessionService, useValue: sessionService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserDisableTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto: UserTwoFactorDisableRequestDto = {
            password: 'Current-pass1',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        it('asserts the re-authentication before the transaction, then completes, disables, revokes, and adds the disable entry on one tx', async () => {
            const calls: string[] = [];
            userAuthService.assertReauthentication.mockImplementation(
                async () => {
                    calls.push('assert');

                    return check;
                }
            );
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
                }
            );
            userTwoFactorService.disableInTx.mockImplementation(async () => {
                calls.push('disableInTx');
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addInTx');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorDisable,
                    password: 'Current-pass1',
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                    otp: null,
                }
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                user,
                check
            );
            expect(userTwoFactorService.disableInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'user-marten',
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userDisableTwoFactor }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(calls).toEqual([
                'assert',
                'begin',
                'complete',
                'disableInTx',
                'revokeSessions',
                'addInTx',
                'commit',
            ]);
        });

        it('passes a backup code and null for every omitted field', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'B1',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorDisable,
                    password: null,
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'B1',
                    otp: null,
                }
            );
        });

        it('passes the email code of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { otp: '123456' }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorDisable,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: '123456',
                }
            );
        });

        it('passes null for every field the request omits', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {}
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorDisable,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: null,
                }
            );
        });

        it('asserts nothing and writes nothing when two-factor is not enabled', async () => {
            const failure = new AuthTwoFactorNotEnabledException();
            userTwoFactorService.assertEnabled.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(
                userAuthService.assertReauthentication
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('leaves the work undone when the proof fails', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userAuthService.assertReauthentication.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(limit);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.disableInTx).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorNotEnabledException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'auth',
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an app exception of the transaction unchanged, adding no entry', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userAuthService.completeReauthenticationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(userTwoFactorService.disableInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
