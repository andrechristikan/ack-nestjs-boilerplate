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
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserTwoFactorHttpService } from '@modules/user/services/http/user.two-factor.http.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserTwoFactorSetup,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type {
    NotificationUserSetting,
    TwoFactor,
} from '@generated/prisma-client/client';

describe('UserTwoFactorHttpService', () => {
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

    let service: UserTwoFactorHttpService;

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
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const passwordAttempt: IUserCredentialAttempt = {
        user,
        hashedPassword: 'hashed-password',
        isAttemptCounted: true,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const notificationTokens = ['token-marten'];
    const settings = [
        { channel: 'push' },
    ] as unknown as NotificationUserSetting[];
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userTwoFactorDomain.countAttempt.mockResolvedValue(true);
        userPasswordDomain.countPasswordAttempt.mockResolvedValue(null);
        userTwoFactorDomain.verify.mockResolvedValue(verified);
        deviceDomain.getNotificationTokens.mockResolvedValue(
            notificationTokens
        );
        notificationDomain.getListUserSetting.mockResolvedValue(settings);
        notificationUtil.mapRecipient.mockReturnValue(recipient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorHttpService,
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                {
                    provide: NotificationDomain,
                    useValue: notificationDomain,
                },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();
        service = module.get(UserTwoFactorHttpService);
    });

    describe('getTwoFactorStatus', () => {
        it('maps and wraps the two-factor status', () => {
            userUtil.mapTwoFactor.mockReturnValue({
                isEnabled: true,
                isPendingConfirmation: false,
                backupCodesRemaining: 1,
                confirmedAt: twoFactor.confirmedAt,
                lastUsedAt: null,
            });

            expect(service.getTwoFactorStatus(user)).toEqual({
                data: {
                    isEnabled: true,
                    isPendingConfirmation: false,
                    backupCodesRemaining: 1,
                    confirmedAt: twoFactor.confirmedAt,
                    lastUsedAt: null,
                },
            });
            expect(userUtil.mapTwoFactor).toHaveBeenCalledWith(twoFactor);
        });

        it('maps a user without a two-factor row', () => {
            const disabled = {
                isEnabled: false,
                isPendingConfirmation: false,
                backupCodesRemaining: 0,
                confirmedAt: null,
                lastUsedAt: null,
            };
            userUtil.mapTwoFactor.mockReturnValue(disabled);

            expect(
                service.getTwoFactorStatus({ ...user, twoFactor: null })
            ).toEqual({ data: disabled });
            expect(userUtil.mapTwoFactor).toHaveBeenCalledWith(null);
        });
    });

    describe('setupTwoFactor', () => {
        const setup: IUserTwoFactorSetup = {
            secret: 'secret',
            otpauthUrl: 'otpauth://totp/secret',
        };
        const setupDto: UserTwoFactorSetupRequestDto = {
            password: 'Current-pass1',
        };

        beforeEach(() => {
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                ...setup,
            });
        });

        it('saves the pending secret and stages the row when two-factor is not enabled', async () => {
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);

            await expect(
                service.setupTwoFactor(user, setupDto)
            ).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorDomain.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, null);
            expect(userTwoFactorDomain.countAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.setup).toHaveBeenCalledWith(user);
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledWith(
                'user-marten',
                'encrypted-pending'
            );
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledBefore(
                activityLogDomain.stagePrepared
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies the backup code, then saves the pending secret consuming it when two-factor is enabled', async () => {
            const dto: UserTwoFactorSetupRequestDto = {
                ...setupDto,
                backupCode: 'BACKUP1',
            };
            const backupVerified: IUserTwoFactorVerifyResult = {
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: [],
            };
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorDomain.verify.mockResolvedValue(backupVerified);

            await expect(service.setupTwoFactor(user, dto)).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorDomain.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, 'BACKUP1');
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(user);
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.verify
            );
            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: 'BACKUP1',
            });
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).toHaveBeenCalledWith(user, 'encrypted-pending', backupVerified);
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('generates and saves nothing when the backup code gate rejects', async () => {
            const failure = new Error('backup code required');
            userTwoFactorDomain.getBackupCodeForSetup.mockImplementation(() => {
                throw failure;
            });

            await expect(service.setupTwoFactor(user, setupDto)).rejects.toBe(
                failure
            );
            expect(userTwoFactorDomain.setup).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('saves nothing when the backup code verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorDomain.verify.mockRejectedValue(failure);

            await expect(
                service.setupTwoFactor(user, {
                    ...setupDto,
                    backupCode: 'BACKUP1',
                })
            ).rejects.toBe(failure);
            expect(userTwoFactorDomain.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('skips the password check for a passwordless account', async () => {
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(null);
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);

            await service.setupTwoFactor(user, {});

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(userAuthDomain.assertPasswordAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledTimes(1);
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);

            await expect(
                service.setupTwoFactor(user, {})
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledTimes(1);
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                null
            );
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(failure);
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);

            await expect(service.setupTwoFactor(user, setupDto)).rejects.toBe(
                failure
            );

            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
        });
    });

    describe('enableTwoFactor', () => {
        const enableDto: UserTwoFactorEnableRequestDto = {
            code: '123456',
            password: 'Current-pass1',
        };

        it('verifies the code against the pending secret, enables, stages the row, and wraps the backup codes', async () => {
            const dto = enableDto;
            const calls: string[] = [];
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.verifySetupCode.mockImplementation(async () => {
                calls.push('verifySetupCode');
            });
            userTwoFactorDomain.enableTwoFactor.mockImplementation(async () => {
                calls.push('enableTwoFactor');

                return ['CODE1'];
            });

            await expect(service.enableTwoFactor(user, dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1'] },
            });

            expect(userTwoFactorDomain.getPendingSecret).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                user,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                'user-marten',
                'pending-secret'
            );
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(user);
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.verifySetupCode
            );
            expect(calls).toEqual(['verifySetupCode', 'enableTwoFactor']);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledBefore(
                activityLogDomain.stagePrepared
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies nothing when no pending secret exists', async () => {
            userTwoFactorDomain.getPendingSecret.mockImplementation(() => {
                throw new Error('no pending');
            });

            await expect(
                service.enableTwoFactor(user, enableDto)
            ).rejects.toThrow('no pending');
            expect(userTwoFactorDomain.verifySetupCode).not.toHaveBeenCalled();
        });

        it('enables nothing and stages nothing when the setup code is rejected', async () => {
            const failure = new Error('invalid');
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.verifySetupCode.mockRejectedValue(failure);

            await expect(
                service.enableTwoFactor(user, { ...enableDto, code: '000000' })
            ).rejects.toBe(failure);
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('skips the password check for a passwordless account', async () => {
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(null);
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);

            await service.enableTwoFactor(user, { code: '123456' });

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(userAuthDomain.assertPasswordAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledTimes(
                1
            );
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(
                service.enableTwoFactor(user, { code: '123456' })
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledTimes(1);
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                null
            );
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(failure);
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(service.enableTwoFactor(user, enableDto)).rejects.toBe(
                failure
            );

            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
        });
    });

    describe('disableTwoFactor', () => {
        const dto: UserTwoFactorDisableRequestDto = {
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        it('verifies, disables and revokes on one transaction, purges after commit, then stages the row', async () => {
            const calls: string[] = [];
            userTwoFactorDomain.verify.mockImplementation(async () => {
                calls.push('verify');

                return verified;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userTwoFactorDomain.disableInTx.mockImplementation(async () => {
                calls.push('disableInTx');
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(service.disableTwoFactor(user, dto)).resolves.toEqual(
                {}
            );

            expect(userTwoFactorDomain.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(user);
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.verify
            );
            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });
            expect(userTwoFactorDomain.disableInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'user-marten',
                now
            );
            expect(calls).toEqual([
                'verify',
                'begin',
                'disableInTx',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDisableTwoFactor,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-marten',
                revoked
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledBefore(
                activityLogDomain.stagePrepared
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('passes a null code when the dto carries a backup code', async () => {
            await service.disableTwoFactor(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            });

            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: 'BACKUP1',
            });
        });

        it('opens no transaction when the verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorDomain.verify.mockRejectedValue(failure);

            await expect(
                service.disableTwoFactor(user, {
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

            await expect(
                service.disableTwoFactor(user, dto)
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
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows an app exception of the transaction unchanged, purging and staging nothing', async () => {
            const failure = new AuthTwoFactorNotEnabledException();
            userTwoFactorDomain.disableInTx.mockRejectedValue(failure);

            await expect(service.disableTwoFactor(user, dto)).rejects.toBe(
                failure
            );
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other transaction failure in the unknown exception, purging and staging nothing', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.disableTwoFactor(user, dto)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('gates, verifies the code, regenerates, stages the row, and wraps the fresh backup codes', async () => {
            const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
                code: '123456',
            };
            userTwoFactorDomain.regenerateTwoFactorBackupCodes.mockResolvedValue(
                ['CODE1', 'CODE2']
            );

            await expect(
                service.regenerateTwoFactorBackupCodes(user, dto)
            ).resolves.toEqual({ data: { backupCodes: ['CODE1', 'CODE2'] } });
            expect(userTwoFactorDomain.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(user);
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.verify
            );
            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });
            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith('user-marten');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            });
            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledBefore(activityLogDomain.stagePrepared);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies nothing when two-factor is not enabled', async () => {
            userTwoFactorDomain.assertEnabled.mockImplementation(() => {
                throw new Error('not enabled');
            });

            await expect(
                service.regenerateTwoFactorBackupCodes(user, { code: '1' })
            ).rejects.toThrow('not enabled');
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the code is rejected', async () => {
            userTwoFactorDomain.verify.mockRejectedValue(new Error('invalid'));

            await expect(
                service.regenerateTwoFactorBackupCodes(user, { code: '0' })
            ).rejects.toThrow('invalid');
            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('resetTwoFactorByAdmin', () => {
        const admin: IUser = {
            ...user,
            id: 'admin-marten',
            role: { ...user.role, type: EnumRoleType.admin },
        };

        beforeEach(() => {
            userDomain.getOneWithRole.mockResolvedValue(user);
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-marten',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-marten',
            });
        });

        it('gates the rank, resets and revokes on one transaction, purges, notifies, and stages both rows', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userTwoFactorDomain.resetByAdminInTx.mockImplementation(
                async () => {
                    calls.push('resetInTx');
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(
                service.resetTwoFactorByAdmin('user-marten', admin)
            ).resolves.toEqual({});

            expect(userDomain.assertNotSelf).toHaveBeenCalledWith(
                'user-marten',
                'admin-marten'
            );
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userDomain.getOneWithRole).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(userTwoFactorDomain.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.resetTwoFactorByAdmin,
                ['token-marten'],
                settings
            );
            expect(userTwoFactorDomain.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'admin-marten',
                now
            );
            expect(calls).toEqual([
                'begin',
                'resetInTx',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-marten',
                revoked
            );
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(recipient, 'admin-marten');
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: { targetUserId: 'user-marten' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                userId: 'user-marten',
                createdBy: 'admin-marten',
                metadata: { actorUserId: 'admin-marten' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                service.resetTwoFactorByAdmin('user-marten', admin)
            ).rejects.toThrow('rank');
            expect(userDomain.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('resets nothing when the recipient read rejects', async () => {
            deviceDomain.getNotificationTokens.mockRejectedValue(
                new Error('read')
            );

            await expect(
                service.resetTwoFactorByAdmin('user-marten', admin)
            ).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                service.resetTwoFactorByAdmin('user-marten', admin)
            ).rejects.toBe(cause);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordMatched', () => {
        const lockoutLogs = [activityLog, activityLog];

        beforeEach(() => {
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            });
        });

        it('counts the attempt and verifies the credential before any other step of setup', async () => {
            const calls: string[] = [];
            userPasswordDomain.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countPasswordAttempt');

                    return passwordAttempt;
                }
            );
            userAuthDomain.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assertPasswordAttempt');
                }
            );
            userTwoFactorDomain.getBackupCodeForSetup.mockImplementation(() => {
                calls.push('getBackupCodeForSetup');

                return null;
            });

            await service.setupTwoFactor(user, { password: 'Current-pass1' });

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'Current-pass1'
            );
            expect(calls).toEqual([
                'countPasswordAttempt',
                'assertPasswordAttempt',
                'getBackupCodeForSetup',
            ]);
        });

        it('counts and verifies the credential before enable verifies the setup code', async () => {
            const calls: string[] = [];
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assertPasswordAttempt');
                }
            );
            userTwoFactorDomain.verifySetupCode.mockImplementation(async () => {
                calls.push('verifySetupCode');
            });

            await service.enableTwoFactor(user, {
                code: '123456',
                password: 'Current-pass1',
            });

            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'Current-pass1'
            );
            expect(calls).toEqual(['assertPasswordAttempt', 'verifySetupCode']);
        });

        it('stages both lockout rows after the spent attempt is counted and answers the attempt limit', async () => {
            const limit = new UserPasswordAttemptMaxException();
            const calls: string[] = [];
            userPasswordDomain.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countPasswordAttempt');

                    return { ...passwordAttempt, isAttemptCounted: false };
                }
            );
            userUtil.buildPasswordLockoutStages.mockReturnValue([
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-marten',
                    createdBy: 'user-marten',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-marten',
                    createdBy: 'user-marten',
                },
            ]);
            userAuthDomain.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assert');

                    throw limit;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stagePrepared');
            });

            await expect(
                service.setupTwoFactor(user, { password: 'Current-pass1' })
            ).rejects.toBe(limit);

            expect(userUtil.buildPasswordLockoutStages).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(calls).toEqual([
                'countPasswordAttempt',
                'stagePrepared',
                'assert',
            ]);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                { ...passwordAttempt, isAttemptCounted: false },
                'Current-pass1'
            );
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
        });

        it('saves nothing when the password does not match', async () => {
            const mismatch = new UserPasswordNotMatchException();
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(mismatch);

            await expect(
                service.setupTwoFactor(user, { password: 'wrong' })
            ).rejects.toBe(mismatch);

            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'wrong'
            );
            expect(userTwoFactorDomain.setup).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
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

        beforeEach(() => {
            userTwoFactorDomain.countAttempt.mockResolvedValue(false);
            userUtil.buildTwoFactorLockoutStages.mockReturnValue(lockoutStages);
            userTwoFactorDomain.assertAttemptCounted.mockImplementation(() => {
                throw limit;
            });
        });

        it('stages both lockout rows after the spent count and answers the attempt limit before the backup code of a setup is verified', async () => {
            const calls: string[] = [];
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorDomain.countAttempt.mockImplementation(async () => {
                calls.push('countAttempt');

                return false;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stagePrepared');
            });

            await expect(
                service.setupTwoFactor(user, {
                    password: 'Current-pass1',
                    backupCode: 'BACKUP1',
                })
            ).rejects.toBe(limit);

            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(user);
            expect(userUtil.buildTwoFactorLockoutStages).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                lockoutStages[0]
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                lockoutStages[1]
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(calls).toEqual(['countAttempt', 'stagePrepared']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
        });

        it('stages the lockout rows and answers the attempt limit before enable verifies the setup code', async () => {
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );

            await expect(
                service.enableTwoFactor(user, {
                    code: '123456',
                    password: 'Current-pass1',
                })
            ).rejects.toBe(limit);

            expect(userUtil.buildTwoFactorLockoutStages).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(userTwoFactorDomain.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('stages the lockout rows and answers the attempt limit before disable verifies the code', async () => {
            await expect(
                service.disableTwoFactor(user, {
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

            expect(userUtil.buildTwoFactorLockoutStages).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.disableInTx).not.toHaveBeenCalled();
        });

        it('stages the lockout rows and answers the attempt limit before regenerate verifies the code', async () => {
            await expect(
                service.regenerateTwoFactorBackupCodes(user, {
                    code: '123456',
                })
            ).rejects.toBe(limit);

            expect(userUtil.buildTwoFactorLockoutStages).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
        });
    });
});
