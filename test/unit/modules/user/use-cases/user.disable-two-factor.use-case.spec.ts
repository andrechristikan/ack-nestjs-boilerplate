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
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserDisableTwoFactorUseCase } from '@modules/user/use-cases/user.disable-two-factor.use-case';

describe('UserDisableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();

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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userDisableTwoFactor,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userTwoFactorService.countAttempt.mockResolvedValue(twoFactorAttempt);
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
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
            ],
        }).compile();
        useCase = module.get(UserDisableTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto: UserTwoFactorDisableRequestDto = {
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        it('verifies, disables and revokes on one transaction, purges after commit, then stages the row', async () => {
            const calls: string[] = [];
            userTwoFactorService.verify.mockImplementation(async () => {
                calls.push('verify');

                return verified;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
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
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(useCase.execute(user, dto)).resolves.toEqual({});

            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verify
            );
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
            expect(calls).toEqual([
                'stage',
                'verify',
                'begin',
                'disableInTx',
                'revokeSessions',
                'commit',
                'purge',
                'stage',
            ]);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDisableTwoFactor,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-marten',
                revoked
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog]
            );
        });

        it('passes a null code when the dto carries a backup code', async () => {
            await useCase.execute(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            });

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
                useCase.execute(user, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '000000',
                })
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorNotEnabledException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(user, dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('rethrows an app exception of the transaction unchanged, purging and staging nothing', async () => {
            const failure = new AuthTwoFactorNotEnabledException();
            userTwoFactorService.disableInTx.mockRejectedValue(failure);

            await expect(useCase.execute(user, dto)).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('wraps any other transaction failure in the unknown exception, purging and staging nothing', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(user, dto)).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });
    });

    describe('assertTwoFactorAttemptCounted', () => {
        const limit = new AuthTwoFactorAttemptMaxException();

        const lockoutLogs = [activityLog, activityLog];

        const lockoutStages = [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-marten',
                createdBy: 'user-marten',
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-marten',
                createdBy: 'user-marten',
            },
        ];

        const spent: IUserTwoFactorAttempt = {
            isAttemptCounted: false,
            lockoutStages,
        };

        beforeEach(() => {
            userTwoFactorService.countAttempt.mockResolvedValue(spent);
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                throw limit;
            });
        });

        it('stages the lockout rows and answers the attempt limit before disable verifies the code', async () => {
            await expect(
                useCase.execute(user, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith(lockoutLogs);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.disableInTx).not.toHaveBeenCalled();
        });
    });
});
