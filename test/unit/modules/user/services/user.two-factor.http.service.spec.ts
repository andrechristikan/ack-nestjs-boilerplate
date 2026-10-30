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
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import type { IAccountTwoFactorLogin } from '@modules/account/interfaces/account.interface';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';

describe('UserTwoFactorHttpService', () => {
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const accountTwoFactorDomain: MockProxy<AccountTwoFactorDomain> =
        mock<AccountTwoFactorDomain>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
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
    const revoked: ISessionRef[] = [{ id: 'session-one' }];

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);

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
                    provide: AccountTwoFactorDomain,
                    useValue: accountTwoFactorDomain,
                },
                { provide: AccountDomain, useValue: accountDomain },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();
        service = module.get(UserTwoFactorHttpService);
    });

    describe('loginVerifyTwoFactor', () => {
        const tokens: IAuthToken = {
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };
        const login: IAccountTwoFactorLogin = {
            user,
            challenge: {
                userId: 'user-marten',
                device: {
                    fingerprint: 'device-marten',
                    name: null,
                    platform: null,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            },
            verified: {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            },
        };
        beforeEach(() => {
            accountTwoFactorDomain.verifyLogin.mockResolvedValue(login);
            accountTwoFactorDomain.issueLoginTokens.mockResolvedValue(tokens);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('verifies, records, stages the verify row, issues the session, and wraps the tokens in order', async () => {
            const dto: UserLoginVerifyTwoFactorRequestDto = {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            };
            const callOrder: string[] = [];
            accountTwoFactorDomain.recordLoginVerification.mockImplementation(
                async () => {
                    callOrder.push('record');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            accountTwoFactorDomain.issueLoginTokens.mockImplementation(
                async () => {
                    callOrder.push('issue');

                    return tokens;
                }
            );

            await expect(service.loginVerifyTwoFactor(dto)).resolves.toEqual({
                data: tokens,
            });
            expect(accountTwoFactorDomain.verifyLogin).toHaveBeenCalledWith(
                'challenge-token',
                { code: dto.code, backupCode: null, method: dto.method }
            );
            expect(
                accountTwoFactorDomain.recordLoginVerification
            ).toHaveBeenCalledWith(login);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(
                accountTwoFactorDomain.issueLoginTokens
            ).toHaveBeenCalledWith(login, 'challenge-token');
            expect(callOrder).toEqual([
                'record',
                'stagePrepared',
                'issue',
                'stagePrepared',
            ]);
        });

        it('passes a null code when the dto carries a backup code', async () => {
            const dto: UserLoginVerifyTwoFactorRequestDto = {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            };

            await service.loginVerifyTwoFactor(dto);

            expect(accountTwoFactorDomain.verifyLogin).toHaveBeenCalledWith(
                'challenge-token',
                { code: null, backupCode: 'BACKUP1', method: dto.method }
            );
        });

        it('issues nothing when the verification rejects', async () => {
            const failure = new Error('invalid');
            accountTwoFactorDomain.verifyLogin.mockRejectedValue(failure);

            await expect(
                service.loginVerifyTwoFactor({
                    challengeToken: 'challenge-token',
                    method: EnumAuthTwoFactorMethod.code,
                    code: '000000',
                })
            ).rejects.toBe(failure);
            expect(
                accountTwoFactorDomain.recordLoginVerification
            ).not.toHaveBeenCalled();
            expect(
                accountTwoFactorDomain.issueLoginTokens
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('loginSetupTwoFactor', () => {
        it('confirms the pending authenticator, stages the row, and wraps the backup codes', async () => {
            const dto: UserLoginSetupTwoFactorRequestDto = {
                challengeToken: 'challenge-token',
                code: '123456',
            };
            accountTwoFactorDomain.verifyLoginSetup.mockResolvedValue({
                user,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue([
                'CODE1',
                'CODE2',
            ]);

            await expect(service.loginSetupTwoFactor(dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1', 'CODE2'] },
            });
            expect(
                accountTwoFactorDomain.verifyLoginSetup
            ).toHaveBeenCalledWith('challenge-token', '123456');
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                'user-marten',
                'pending-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
            });
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledBefore(
                activityLogDomain.stagePrepared
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('enables nothing when the setup code is rejected', async () => {
            accountTwoFactorDomain.verifyLoginSetup.mockRejectedValue(
                new Error('invalid')
            );

            await expect(
                service.loginSetupTwoFactor({
                    challengeToken: 'challenge-token',
                    code: '000000',
                })
            ).rejects.toThrow('invalid');
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
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

        it('passes the backup code through, then stages the row', async () => {
            const dto: UserTwoFactorSetupRequestDto = {
                backupCode: 'BACKUP1',
            };
            accountTwoFactorDomain.setup.mockResolvedValue(setup);

            await expect(service.setupTwoFactor(user, dto)).resolves.toEqual({
                data: setup,
            });
            expect(accountTwoFactorDomain.setup).toHaveBeenCalledWith(
                user,
                'BACKUP1'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(accountTwoFactorDomain.setup).toHaveBeenCalledBefore(
                activityLogDomain.stagePrepared
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('defaults the backup code to null when not given', async () => {
            accountTwoFactorDomain.setup.mockResolvedValue(setup);

            await service.setupTwoFactor(user, {});

            expect(accountTwoFactorDomain.setup).toHaveBeenCalledWith(
                user,
                null
            );
        });

        it('stages nothing when the setup rejects', async () => {
            accountTwoFactorDomain.setup.mockRejectedValue(
                new Error('invalid')
            );

            await expect(service.setupTwoFactor(user, {})).rejects.toThrow(
                'invalid'
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('enableTwoFactor', () => {
        it('verifies the code against the pending secret, enables, stages the row, and wraps the backup codes', async () => {
            const dto: UserTwoFactorEnableRequestDto = { code: '123456' };
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(service.enableTwoFactor(user, dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1'] },
            });
            expect(userTwoFactorDomain.getPendingSecret).toHaveBeenCalledWith(
                user
            );
            expect(accountTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                user,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                'user-marten',
                'pending-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
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
                service.enableTwoFactor(user, { code: '123456' })
            ).rejects.toThrow('no pending');
            expect(
                accountTwoFactorDomain.verifySetupCode
            ).not.toHaveBeenCalled();
        });

        it('enables nothing when the code is rejected', async () => {
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            accountTwoFactorDomain.verifySetupCode.mockRejectedValue(
                new Error('invalid')
            );

            await expect(
                service.enableTwoFactor(user, { code: '000000' })
            ).rejects.toThrow('invalid');
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('disableTwoFactor', () => {
        beforeEach(() => {
            accountTwoFactorDomain.disable.mockResolvedValue(revoked);
        });

        it('verifies, disables, purges the revoked logins, then stages the row', async () => {
            const dto: UserTwoFactorDisableRequestDto = {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            };

            await expect(service.disableTwoFactor(user, dto)).resolves.toEqual(
                {}
            );

            expect(userTwoFactorDomain.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(accountTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                code: dto.code,
                backupCode: null,
                method: dto.method,
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDisableTwoFactor,
            });
            expect(accountTwoFactorDomain.disable).toHaveBeenCalledWith(
                'user-marten'
            );
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
            const dto: UserTwoFactorDisableRequestDto = {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            };

            await service.disableTwoFactor(user, dto);

            expect(accountTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
                code: null,
                backupCode: 'BACKUP1',
                method: dto.method,
            });
        });

        it('disables nothing when the verification rejects', async () => {
            accountTwoFactorDomain.verify.mockRejectedValue(
                new Error('invalid')
            );

            await expect(
                service.disableTwoFactor(user, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '000000',
                })
            ).rejects.toThrow('invalid');
            expect(accountTwoFactorDomain.disable).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
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
            expect(accountTwoFactorDomain.verify).toHaveBeenCalledWith(user, {
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
            expect(accountTwoFactorDomain.verify).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the code is rejected', async () => {
            accountTwoFactorDomain.verify.mockRejectedValue(
                new Error('invalid')
            );

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
            accountDomain.getNotificationRecipientOfUser.mockResolvedValue(
                recipient
            );
            accountTwoFactorDomain.resetByAdmin.mockResolvedValue(revoked);
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-marten',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-marten',
            });
        });

        it('gates the rank, resets, clears the lock, purges, notifies, and stages both rows', async () => {
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
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.resetTwoFactorByAdmin
            );
            expect(accountTwoFactorDomain.resetByAdmin).toHaveBeenCalledWith(
                'user-marten',
                'admin-marten'
            );
            expect(authTwoFactorDomain.clearLock).toHaveBeenCalledWith(user);
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
            expect(accountTwoFactorDomain.resetByAdmin).not.toHaveBeenCalled();
        });

        it('resets nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('read')
            );

            await expect(
                service.resetTwoFactorByAdmin('user-marten', admin)
            ).rejects.toThrow('read');
            expect(accountTwoFactorDomain.resetByAdmin).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
