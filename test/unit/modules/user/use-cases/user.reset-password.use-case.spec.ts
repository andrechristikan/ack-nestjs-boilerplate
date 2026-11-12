import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type {
    PasswordHistory,
    TwoFactor,
    User,
} from '@generated/prisma-client/client';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationSnapshot } from '@modules/notification/interfaces/notification.interface';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import {
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type {
    IUser,
    IUserForgotPassword,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';
import { buildRequestContextPublic } from '@test/unit/helpers/test.unit.request.helper';

describe('UserResetPasswordUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const context = buildRequestContextPublic();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserResetPasswordUseCase;

    const user: IUser = {
        id: 'user-linden',
        name: 'Linden Frost',
        username: 'lindenFrost',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'linden@example.com',
        roleId: 'role-linden',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-linden',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
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
            id: 'role-linden',
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
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const resetEntry: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'reset',
    };
    const verifyEntry: IOutboxEffect = {
        ...resetEntry,
        idempotencyKey: 'verify',
    };
    const snapshot: INotificationSnapshot = {
        username: 'lindenFrost',
        encryptedEmail: 'cipher(linden@example.com)',
        encryptedTokens: ['cipher(token-one)'],
    };
    const notifyEffect: IOutboxEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.resetPassword,
            context: {
                userId: 'user-linden',
                proceedBy: 'user-linden',
                snapshot,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const twoFactorRow: TwoFactor = {
        id: 'two-factor-linden',
        userId: 'user-linden',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const twoFactorUser: IUser = { ...user, twoFactor: twoFactorRow };
    const twoFactorSetupUser: IUser = {
        ...user,
        twoFactor: { ...twoFactorRow, requiredSetup: true },
    };
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const twoFactorVerified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;
    const resetRow = {
        id: 'forgot-linden',
        userId: 'user-linden',
        user,
    } as IUserForgotPassword;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockImplementation((_context, input) =>
            input.action === EnumActivityLogAction.userVerifyTwoFactor
                ? verifyEntry
                : resetEntry
        );
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationService.notify.mockReturnValue(notifyEffect);
        userTwoFactorService.verifyIfRequired.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserResetPasswordUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserResetPasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserForgotPasswordResetRequestDto = {
            newPassword: 'new-password',
            token: 'raw-token',
        };

        const resetTwoFactorRow = {
            ...resetRow,
            user: twoFactorUser,
        } as IUserForgotPassword;

        beforeEach(() => {
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('checks the history, hashes, and writes the reset, its entry, and the notification on one transaction', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryService.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            userPasswordService.markResetUsedInTx.mockImplementation(
                async () => {
                    calls.push('markResetUsed');
                }
            );
            userPasswordService.markUnusedResetsUsedInTx.mockImplementation(
                async () => {
                    calls.push('markUnusedResetsUsed');
                }
            );
            notificationService.getSnapshot.mockImplementation(async () => {
                calls.push('snapshot');

                return snapshot;
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                calls.push('addEffects');

                return ['outbox-id'];
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );

            await expect(useCase.execute(context, dto)).resolves.toEqual({});

            expect(userPasswordService.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(userTwoFactorService.verifyIfRequired).toHaveBeenCalledWith(
                context.snapshot,
                user,
                { code: null, backupCode: null, method: null }
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                context.snapshot,
                {
                    action: EnumActivityLogAction.userResetPassword,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(notificationService.getSnapshot).toHaveBeenCalledWith(user);
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetPassword,
                {
                    userId: 'user-linden',
                    proceedBy: 'user-linden',
                    snapshot,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resetEntry,
                notifyEffect,
            ]);
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
            expect(passwordHistoryService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.forgot,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(userPasswordService.markResetUsedInTx).toHaveBeenCalledWith(
                tx,
                'forgot-linden',
                password.passwordCreated
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'begin',
                'snapshot',
                'updatePassword',
                'createHistory',
                'markResetUsed',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('starts the snapshot read while the first statement is pending and reads it before the revoke', async () => {
            let snapshotStarted = false;
            let startedWhenFirstSettles = false;
            notificationService.getSnapshot.mockImplementation(async () => {
                snapshotStarted = true;

                return snapshot;
            });
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            userService.updatePasswordInTx.mockImplementation(async () => {
                await Promise.resolve();
                startedWhenFirstSettles = snapshotStarted;

                return updatedRow;
            });

            await useCase.execute(context, dto);

            expect(startedWhenFirstSettles).toBe(true);
            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                sessionService.revokeActiveByUserInTx
            );
        });

        it('verifies two-factor of the reset user, records it on the transaction, and adds the verify entry when two-factor was verified', async () => {
            userTwoFactorService.verifyIfRequired.mockResolvedValue(
                twoFactorVerified
            );
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );

            await useCase.execute(context, {
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(userTwoFactorService.verifyIfRequired).toHaveBeenCalledWith(
                context.snapshot,
                twoFactorUser,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, twoFactorVerified);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                context.snapshot,
                {
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resetEntry,
                verifyEntry,
                notifyEffect,
            ]);
        });

        it('records no two-factor verification while the service verified nothing', async () => {
            userPasswordService.getOneActiveReset.mockResolvedValue({
                ...resetRow,
                user: twoFactorSetupUser,
            });

            await expect(useCase.execute(context, dto)).resolves.toEqual({});

            expect(userTwoFactorService.verifyIfRequired).toHaveBeenCalledWith(
                context.snapshot,
                twoFactorSetupUser,
                { code: null, backupCode: null, method: null }
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                }),
                context.snapshot
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
        });

        it('answers the attempt limit when the two-factor budget is spent and writes nothing', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );
            userTwoFactorService.verifyIfRequired.mockRejectedValue(limit);

            await expect(
                useCase.execute(context, {
                    ...dto,
                    code: '123456',
                    method: EnumAuthTwoFactorMethod.code,
                })
            ).rejects.toBe(limit);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws the method-required exception and writes nothing', async () => {
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );
            userTwoFactorService.verifyIfRequired.mockRejectedValue(
                new AuthTwoFactorMethodRequiredException()
            );

            await expect(
                useCase.execute(context, { ...dto, code: '123456' })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorMethodRequired
                    ],
                messagePath: 'auth.error.twoFactorMethodRequired',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks and writes nothing when the reset lookup rejects', async () => {
            const failure = new Error('flag');
            userPasswordService.getOneActiveReset.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the history check rejects', async () => {
            const failure = new Error('must new');
            passwordHistoryService.assertNew.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes nothing and adds no effect when the snapshot read rejects', async () => {
            const cause = new Error('read');
            notificationService.getSnapshot.mockRejectedValue(cause);

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                rawError: cause,
            });
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a typed exception the transaction raises', async () => {
            const failure = new UserTokenInvalidException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                rawError: cause,
            });
        });
    });
});
