import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDeviceNotificationProvider,
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type {
    DeviceOwnership,
    NotificationUserSetting,
    User,
} from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('AccountDomain', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let domain: AccountDomain;

    const at = new Date('2024-01-01T00:00:00.000Z');
    const user = {
        id: 'user-id',
        email: 'nadia@example.com',
        username: 'nadia',
    } as User;
    const ownership: DeviceOwnership = {
        id: 'ownership-id',
        deviceId: 'device-id',
        userId: user.id,
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: at,
        notificationToken: 't1',
        notificationProvider: EnumDeviceNotificationProvider.fcm,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: at,
        createdBy: null,
        updatedAt: at,
        updatedBy: null,
    };
    const setting: NotificationUserSetting = {
        id: 'setting-id',
        userId: user.id,
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: false,
        createdAt: at,
        createdBy: null,
        updatedAt: at,
        updatedBy: null,
    };
    const snapshot: INotificationRecipient = {
        userId: user.id,
        email: user.email,
        username: user.username,
        notificationTokens: ['t1'],
        channels: [EnumNotificationChannel.push],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                AccountDomain,
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = moduleRef.get(AccountDomain);
    });

    describe('getNotificationRecipientOfUser', () => {
        it('shapes the given user whatever its status, with its device tokens and settings', async () => {
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                ownership,
            ]);
            notificationDomain.getListUserSetting.mockResolvedValue([setting]);
            notificationUtil.mapRecipient.mockReturnValue(snapshot);

            const result = await domain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.verifiedEmail
            );

            expect(userDomain.getOneActive).not.toHaveBeenCalled();
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledWith('user-id');
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-id'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verifiedEmail,
                ['t1'],
                [setting]
            );
            expect(result).toBe(snapshot);
        });

        it('starts both reads before either resolves', async () => {
            const tokenRead = Promise.withResolvers<DeviceOwnership[]>();
            const settingRead =
                Promise.withResolvers<NotificationUserSetting[]>();
            deviceDomain.getOwnershipsWithNotificationToken.mockReturnValue(
                tokenRead.promise
            );
            notificationDomain.getListUserSetting.mockReturnValue(
                settingRead.promise
            );
            notificationUtil.mapRecipient.mockReturnValue(snapshot);

            const pending = domain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.verifiedEmail
            );

            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledTimes(1);
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledTimes(
                1
            );

            tokenRead.resolve([]);
            settingRead.resolve([]);

            await expect(pending).resolves.toBe(snapshot);
        });
    });

    describe('getNotificationRecipient', () => {
        it('shapes the active user, the device tokens, and the user settings into the recipient snapshot of the kind', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                ownership,
            ]);
            notificationDomain.getListUserSetting.mockResolvedValue([setting]);
            notificationUtil.mapRecipient.mockReturnValue(snapshot);

            const result = await domain.getNotificationRecipient(
                'user-id',
                EnumNotificationKind.workspaceInvite
            );

            expect(userDomain.getOneActive).toHaveBeenCalledWith('user-id');
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledWith('user-id');
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-id'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.workspaceInvite,
                ['t1'],
                [setting]
            );
            expect(result).toBe(snapshot);
        });

        it('returns null without shaping when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );
            notificationDomain.getListUserSetting.mockResolvedValue([]);

            const result = await domain.getNotificationRecipient(
                'user-id',
                EnumNotificationKind.workspaceInvite
            );

            expect(result).toBeNull();
            expect(notificationUtil.mapRecipient).not.toHaveBeenCalled();
        });

        it('starts the three reads before any resolves', async () => {
            const userRead = Promise.withResolvers<User | null>();
            const tokenRead = Promise.withResolvers<DeviceOwnership[]>();
            const settingRead =
                Promise.withResolvers<NotificationUserSetting[]>();
            userDomain.getOneActive.mockReturnValue(userRead.promise);
            deviceDomain.getOwnershipsWithNotificationToken.mockReturnValue(
                tokenRead.promise
            );
            notificationDomain.getListUserSetting.mockReturnValue(
                settingRead.promise
            );
            notificationUtil.mapRecipient.mockReturnValue(snapshot);

            const pending = domain.getNotificationRecipient(
                'user-id',
                EnumNotificationKind.workspaceInvite
            );

            expect(userDomain.getOneActive).toHaveBeenCalledTimes(1);
            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledTimes(1);
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledTimes(
                1
            );

            userRead.resolve(user);
            tokenRead.resolve([]);
            settingRead.resolve([]);

            await expect(pending).resolves.toBe(snapshot);
        });
    });

    describe('updateStatusByAdmin', () => {
        const tx = {} as IDatabaseTransactionClient;
        const now = new Date('2026-03-01T00:00:00.000Z');
        const revoked: ISessionRef[] = [{ id: 'session-one' }];
        const row = { id: 'user-id', status: EnumUserStatus.inactive } as User;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            helperDateService.create.mockReturnValue(now);
            userDomain.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('writes the status then revokes the sessions when the status takes access away', async () => {
            const calls: string[] = [];
            userDomain.updateStatusByAdminInTx.mockImplementation(async () => {
                calls.push('status');

                return row;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return revoked;
                }
            );

            const result = await domain.updateStatusByAdmin(
                'user-id',
                EnumUserStatus.inactive,
                3,
                'admin-id'
            );

            expect(result).toEqual({ user: row, revoked });
            expect(calls).toEqual(['status', 'revoke']);
            expect(userDomain.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                EnumUserStatus.inactive,
                3
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                'admin-id',
                now
            );
        });

        it('revokes nothing and returns no revoked list when the status is active', async () => {
            const result = await domain.updateStatusByAdmin(
                'user-id',
                EnumUserStatus.active,
                3,
                'admin-id'
            );

            expect(result).toEqual({ user: row, revoked: null });
            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
        });

        it('wraps a failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );

            await expect(
                domain.updateStatusByAdmin(
                    'user-id',
                    EnumUserStatus.blocked,
                    3,
                    'admin-id'
                )
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });

    describe('deleteSelf', () => {
        const tx = {} as IDatabaseTransactionClient;
        const now = new Date('2026-03-01T00:00:00.000Z');
        const revoked: ISessionRef[] = [{ id: 'session-one' }];
        const row = { id: 'user-id', photo: null } as User;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            helperDateService.create.mockReturnValue(now);
            userDomain.deleteSelfInTx.mockResolvedValue(row);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('deletes the user then revokes its sessions and devices on one transaction', async () => {
            const calls: string[] = [];
            userDomain.deleteSelfInTx.mockImplementation(async () => {
                calls.push('delete');

                return row;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('sessions');

                    return revoked;
                }
            );
            deviceDomain.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('devices');
            });

            const result = await domain.deleteSelf('user-id');

            expect(result).toEqual({ user: row, revoked });
            expect(calls).toEqual(['delete', 'sessions', 'devices']);
            expect(userDomain.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                now
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                'user-id',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                'user-id',
                now
            );
        });

        it('wraps a failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );

            await expect(domain.deleteSelf('user-id')).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });
});
