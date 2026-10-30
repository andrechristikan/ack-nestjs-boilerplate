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
import { DatabaseService } from '@common/database/services/database.service';
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
import { UserDomain } from '@modules/user/domains/user.domain';
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

        beforeEach(() => {
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                ...setup,
            });
        });

        it('saves the pending secret and stages the row when two-factor is not enabled', async () => {
            userTwoFactorDomain.getBackupCodeForSetup.mockReturnValue(null);

            await expect(service.setupTwoFactor(user, {})).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorDomain.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, null);
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

            await expect(service.setupTwoFactor(user, {})).rejects.toBe(
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
                service.setupTwoFactor(user, { backupCode: 'BACKUP1' })
            ).rejects.toBe(failure);
            expect(userTwoFactorDomain.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('enableTwoFactor', () => {
        it('verifies the code against the pending secret, enables, stages the row, and wraps the backup codes', async () => {
            const dto: UserTwoFactorEnableRequestDto = { code: '123456' };
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
            expect(calls).toEqual(['verifySetupCode', 'enableTwoFactor']);
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
            expect(userTwoFactorDomain.verifySetupCode).not.toHaveBeenCalled();
        });

        it('enables nothing and stages nothing when the setup code is rejected', async () => {
            const failure = new Error('invalid');
            userTwoFactorDomain.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorDomain.verifySetupCode.mockRejectedValue(failure);

            await expect(
                service.enableTwoFactor(user, { code: '000000' })
            ).rejects.toBe(failure);
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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

        it('purges and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(service.disableTwoFactor(user, dto)).rejects.toBe(
                cause
            );
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

        it('gates the rank, resets and revokes on one transaction, clears the lock, purges, notifies, and stages both rows', async () => {
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
            expect(userTwoFactorDomain.clearLock).toHaveBeenCalledWith(user);
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
            expect(userTwoFactorDomain.clearLock).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
