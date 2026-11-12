import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type {
    IUser,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserDisableTwoFactorUseCase } from '@modules/user/use-cases/user.disable-two-factor.use-case';

describe('UserDisableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserDisableTwoFactorUseCase;

    const twoFactor: TwoFactor = {
        id: 'two-factor-marten',
        userId: 'user-marten',
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
    const user: IUser = {
        id: 'user-marten',
        name: 'Marten Cole',
        username: 'martenCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marten@example.com',
        roleId: 'role-marten',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-marten',
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
            id: 'role-marten',
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
        twoFactor,
    };
    const entryEffect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const context = buildRequestContext('user-marten');
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userTwoFactorService.verify.mockResolvedValue(verified);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDisableTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
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
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        it('counts the attempt, verifies, then disables, revokes, and adds the disable entry on one transaction', async () => {
            const calls: string[] = [];
            userTwoFactorService.assertAttemptCounted.mockImplementation(
                async () => {
                    calls.push('assertAttemptCounted');
                }
            );
            userTwoFactorService.verify.mockImplementation(async () => {
                calls.push('verify');

                return verified;
            });
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
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

            await expect(useCase.execute(user, dto, context)).resolves.toEqual(
                {}
            );

            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(user, context);
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });
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
                { action: EnumActivityLogAction.userDisableTwoFactor },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(calls).toEqual([
                'assertAttemptCounted',
                'verify',
                'begin',
                'disableInTx',
                'revokeSessions',
                'addInTx',
                'commit',
            ]);
        });

        it('passes a null code when the dto carries a backup code', async () => {
            await useCase.execute(
                user,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'BACKUP1',
                },
                context
            );

            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: 'BACKUP1',
            });
        });

        it('opens no transaction when the verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    user,
                    {
                        method: EnumAuthTwoFactorMethod.code,
                        code: '000000',
                    },
                    context
                )
            ).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorNotEnabledException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(user, dto, context)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an app exception of the transaction unchanged, adding no entry', async () => {
            const failure = new AuthTwoFactorNotEnabledException();
            userTwoFactorService.disableInTx.mockRejectedValue(failure);

            await expect(useCase.execute(user, dto, context)).rejects.toBe(
                failure
            );
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(user, dto, context)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });

        it('answers the attempt limit before disable verifies the code', async () => {
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(
                useCase.execute(user, dto, context)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.disableInTx).not.toHaveBeenCalled();
        });
    });
});
