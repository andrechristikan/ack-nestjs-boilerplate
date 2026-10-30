import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type {
    IUser,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('UserPasswordHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const accountPasswordDomain: MockProxy<AccountPasswordDomain> =
        mock<AccountPasswordDomain>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const accountTwoFactorDomain: MockProxy<AccountTwoFactorDomain> =
        mock<AccountTwoFactorDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserPasswordHttpService;

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
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const admin: IUser = {
        ...user,
        id: 'admin-linden',
        role: { ...user.role, type: EnumRoleType.admin },
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userChangePassword,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const twoFactorVerified: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;
    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-linden',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        token: 'raw-token',
        hashedToken: 'hashed-token',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };
    const resetRow = {
        id: 'forgot-linden',
        userId: 'user-linden',
        user,
    } as IUserForgotPassword;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);
        accountDomain.getNotificationRecipientOfUser.mockResolvedValue(
            recipient
        );
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-01T00:00:00.000Z'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordHttpService,
                { provide: UserDomain, useValue: userDomain },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                {
                    provide: AccountPasswordDomain,
                    useValue: accountPasswordDomain,
                },
                { provide: AccountDomain, useValue: accountDomain },
                {
                    provide: AccountTwoFactorDomain,
                    useValue: accountTwoFactorDomain,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserPasswordHttpService);
    });

    describe('updatePasswordByAdmin', () => {
        beforeEach(() => {
            userDomain.getOneWithRole.mockResolvedValue(user);
            userPasswordDomain.createTemporaryPassword.mockResolvedValue({
                password,
                passwordString: 'temp-password',
            });
            accountPasswordDomain.updateByAdmin.mockResolvedValue({
                user: updatedRow,
                passwordHistoryId: 'history-linden',
                revoked,
            });
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-linden',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-linden',
            });
        });

        it('gates the actor rank, writes, purges, notifies, and stages both rows', async () => {
            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).resolves.toEqual({});

            expect(userDomain.assertNotSelf).toHaveBeenCalledWith(
                'user-linden',
                'admin-linden'
            );
            expect(userDomain.getOneWithRole).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.temporaryPasswordByAdmin
            );
            expect(accountPasswordDomain.updateByAdmin).toHaveBeenCalledWith(
                'user-linden',
                password,
                'admin-linden'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'temp-password',
                    passwordCreatedAt: '2026-03-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-01T00:00:00.000Z',
                },
                'admin-linden',
                'history-linden'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: { targetUserId: 'user-linden' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId: 'user-linden',
                createdBy: 'admin-linden',
                metadata: { actorUserId: 'admin-linden' },
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
                service.updatePasswordByAdmin('user-linden', admin)
            ).rejects.toThrow('rank');
            expect(userDomain.assertUnblocked).not.toHaveBeenCalled();
            expect(accountPasswordDomain.updateByAdmin).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('read')
            );

            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).rejects.toThrow('read');
            expect(accountPasswordDomain.updateByAdmin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            oldPassword: 'old-password',
        };

        beforeEach(() => {
            accountTwoFactorDomain.verifyIfEnabled.mockResolvedValue(null);
            authPasswordUtil.createPassword.mockResolvedValue(password);
            accountPasswordDomain.change.mockResolvedValue({
                passwordHistoryId: 'history-linden',
                revoked,
            });
        });

        it('verifies, hashes, writes, purges, notifies, and stages the row', async () => {
            await expect(service.changePassword(user, dto)).resolves.toEqual(
                {}
            );

            expect(accountPasswordDomain.verifyChange).toHaveBeenCalledWith(
                user,
                'old-password',
                'new-password'
            );
            expect(accountTwoFactorDomain.verifyIfEnabled).toHaveBeenCalledWith(
                user,
                {
                    code: null,
                    backupCode: null,
                    method: null,
                }
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(
                accountTwoFactorDomain.verifyIfEnabled
            ).toHaveBeenCalledBefore(authPasswordUtil.createPassword);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userChangePassword,
            });
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(user, EnumNotificationKind.changePassword);
            expect(accountPasswordDomain.change).toHaveBeenCalledWith(
                user,
                password,
                null
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(notificationQueue.sendChangePassword).toHaveBeenCalledWith(
                recipient,
                'history-linden'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('stages the verify-two-factor row too when the check passed', async () => {
            accountTwoFactorDomain.verifyIfEnabled.mockResolvedValue(
                twoFactorVerified
            );

            await service.changePassword(user, {
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(accountPasswordDomain.change).toHaveBeenCalledWith(
                user,
                password,
                twoFactorVerified
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('writes nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('read')
            );

            await expect(service.changePassword(user, dto)).rejects.toThrow(
                'read'
            );
            expect(accountPasswordDomain.change).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        const dto: UserForgotPasswordRequestDto = {
            email: 'linden@example.com',
        };

        beforeEach(() => {
            userPasswordDomain.prepareForgotPassword.mockResolvedValue({
                user,
                forgot,
            });
        });

        it('gates the flag, creates the request, stages the row, then notifies', async () => {
            const calls: string[] = [];
            userPasswordDomain.createForgotPassword.mockImplementation(
                async () => {
                    calls.push('create');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendForgotPassword.mockImplementation(
                async () => {
                    calls.push('notify');
                }
            );

            await expect(service.forgotPassword(dto)).resolves.toEqual({});

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(userPasswordDomain.prepareForgotPassword);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userForgotPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(user, EnumNotificationKind.forgotPassword);
            expect(
                userPasswordDomain.createForgotPassword
            ).toHaveBeenCalledWith('user-linden', 'linden@example.com', forgot);
            expect(notificationQueue.sendForgotPassword).toHaveBeenCalledWith(
                recipient,
                {
                    expiredAt: '2026-03-01T00:00:00.000Z',
                    link: forgot.link,
                    reference: 'FGT-linden',
                    expiredInMinutes: 15,
                    resendInMinutes: 5,
                }
            );
            expect(calls).toEqual(['create', 'stage', 'notify']);
        });

        it('creates nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('read')
            );

            await expect(service.forgotPassword(dto)).rejects.toThrow('read');
            expect(
                userPasswordDomain.createForgotPassword
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('reads nothing when the flag gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new Error('flag')
            );

            await expect(service.forgotPassword(dto)).rejects.toThrow('flag');
            expect(
                userPasswordDomain.prepareForgotPassword
            ).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        const dto: UserForgotPasswordResetRequestDto = {
            newPassword: 'new-password',
            token: 'raw-token',
        };

        beforeEach(() => {
            userPasswordDomain.getOneActiveReset.mockResolvedValue(resetRow);
            accountTwoFactorDomain.verifyIfEnabled.mockResolvedValue(null);
            authPasswordUtil.createPassword.mockResolvedValue(password);
            accountPasswordDomain.reset.mockResolvedValue(revoked);
        });

        it('gates the flag, checks the history, hashes, writes, purges, notifies, and stages', async () => {
            await expect(service.resetPassword(dto)).resolves.toEqual({});

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
            expect(userPasswordDomain.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(accountPasswordDomain.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(accountPasswordDomain.assertNew).toHaveBeenCalledBefore(
                accountTwoFactorDomain.verifyIfEnabled
            );
            expect(accountTwoFactorDomain.verifyIfEnabled).toHaveBeenCalledWith(
                user,
                {
                    code: null,
                    backupCode: null,
                    method: null,
                }
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userResetPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(user, EnumNotificationKind.resetPassword);
            expect(accountPasswordDomain.reset).toHaveBeenCalledWith(
                resetRow,
                password,
                null
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(notificationQueue.sendResetPassword).toHaveBeenCalledWith(
                recipient,
                'forgot-linden'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('stages the verify-two-factor row too when the check passed', async () => {
            accountTwoFactorDomain.verifyIfEnabled.mockResolvedValue(
                twoFactorVerified
            );

            await service.resetPassword({
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('writes nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('read')
            );

            await expect(service.resetPassword(dto)).rejects.toThrow('read');
            expect(accountPasswordDomain.reset).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });
});
