import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    NotificationUserSetting,
    User,
} from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNotifyPayload,
    INotificationRecipientRecord,
    INotificationSnapshot,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationProcessUseCase } from '@modules/notification/use-cases/notification.process.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';

describe('NotificationProcessUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    let useCase: NotificationProcessUseCase;

    const data: INotificationNotifyPayload = {
        kind: EnumNotificationKind.workspaceInvite,
        context: {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            reference: 'WI-ref',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
            encryptedLink: 'encrypted-link',
        },
        recipient: null,
        notificationId: null,
    };

    const recipient: INotificationRecipientRecord = {
        userId: 'user-id',
        username: 'invitee',
        encryptedEmail: 'encrypted-email',
        encryptedTokens: ['encrypted-token'],
        channels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    };

    const user: User = {
        id: 'user-id',
        name: null,
        username: 'invitee',
        isVerified: true,
        verifiedAt: null,
        email: 'invitee@example.com',
        roleId: 'role-id',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2024-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const setting: NotificationUserSetting = {
        id: 'setting-id',
        userId: 'user-id',
        channel: EnumNotificationChannel.push,
        type: EnumNotificationType.userActivity,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        const module = await Test.createTestingModule({
            providers: [
                NotificationProcessUseCase,
                { provide: UserService, useValue: userService },
                { provide: DeviceService, useValue: deviceService },
                { provide: NotificationService, useValue: notificationService },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationProcessUseCase);
    });

    describe('execute', () => {
        it('resolves and records the recipient and the notification id, then creates the notification on one tx', async () => {
            userService.getOneActive.mockResolvedValue(user);
            notificationService.getListUserSetting.mockResolvedValue([setting]);
            deviceService.getNotificationTokens.mockResolvedValue(['token']);
            notificationUtil.resolveChannels.mockReturnValue(
                recipient.channels
            );
            notificationService.toRecipientRecord.mockReturnValue(recipient);
            databaseUtil.createId.mockReturnValue('notification-id');

            const result = await useCase.execute('outbox-id', data);

            expect(userService.getOneActive).toHaveBeenCalledWith('user-id');
            expect(notificationService.getListUserSetting).toHaveBeenCalledWith(
                'user-id'
            );
            expect(deviceService.getNotificationTokens).toHaveBeenCalledWith(
                'user-id'
            );
            expect(notificationUtil.resolveChannels).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                [setting]
            );
            expect(notificationService.toRecipientRecord).toHaveBeenCalledWith(
                user,
                ['token'],
                recipient.channels
            );
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                recipient,
                notificationId: 'notification-id',
            });
            expect(notificationService.createInTx).toHaveBeenCalledWith(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                data.context,
                recipient
            );
            expect(result).toEqual({
                message: 'notification.queue.notify',
            });
        });

        it('builds the recipient from a snapshot with no resolve, records it, and creates the notification on one tx', async () => {
            const snapshot: INotificationSnapshot = {
                username: 'invitee',
                encryptedEmail: 'encrypted-email',
                encryptedTokens: ['encrypted-token'],
            };
            const snapshotData: INotificationNotifyPayload = {
                kind: EnumNotificationKind.resetPassword,
                context: { userId: 'user-id', proceedBy: 'user-id', snapshot },
                recipient: null,
                notificationId: null,
            };
            notificationService.toSnapshotRecipientRecord.mockReturnValue(
                recipient
            );
            databaseUtil.createId.mockReturnValue('notification-id');

            const result = await useCase.execute('outbox-id', snapshotData);

            expect(
                notificationService.toSnapshotRecipientRecord
            ).toHaveBeenCalledWith(
                EnumNotificationKind.resetPassword,
                'user-id',
                snapshot
            );
            expect(userService.getOneActive).not.toHaveBeenCalled();
            expect(deviceService.getNotificationTokens).not.toHaveBeenCalled();
            expect(
                notificationService.getListUserSetting
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                recipient,
                notificationId: 'notification-id',
            });
            expect(notificationService.createInTx).toHaveBeenCalledWith(
                tx,
                'notification-id',
                EnumNotificationKind.resetPassword,
                snapshotData.context,
                recipient
            );
            expect(result).toEqual({
                message: 'notification.queue.notify',
            });
        });

        it('reuses the recorded recipient and notification id on a later attempt', async () => {
            await useCase.execute('outbox-id', {
                ...data,
                recipient,
                notificationId: 'notification-id',
            });

            expect(userService.getOneActive).not.toHaveBeenCalled();
            expect(deviceService.getNotificationTokens).not.toHaveBeenCalled();
            expect(databaseUtil.createId).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(notificationService.createInTx).toHaveBeenCalledWith(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                data.context,
                recipient
            );
        });

        it('reuses the recorded recipient of a snapshot kind on a later attempt', async () => {
            const snapshotData: INotificationNotifyPayload = {
                kind: EnumNotificationKind.resetPassword,
                context: {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    snapshot: {
                        username: 'invitee',
                        encryptedEmail: 'encrypted-email',
                        encryptedTokens: ['encrypted-token'],
                    },
                },
                recipient,
                notificationId: 'notification-id',
            };

            await useCase.execute('outbox-id', snapshotData);

            expect(
                notificationService.toSnapshotRecipientRecord
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(notificationService.createInTx).toHaveBeenCalledWith(
                tx,
                'notification-id',
                EnumNotificationKind.resetPassword,
                snapshotData.context,
                recipient
            );
        });

        it('completes with no row when the user is missing or inactive', async () => {
            userService.getOneActive.mockResolvedValue(null);
            notificationService.getListUserSetting.mockResolvedValue([]);
            deviceService.getNotificationTokens.mockResolvedValue([]);

            const result = await useCase.execute('outbox-id', data);

            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noRecipient',
            });
        });

        it('completes with no row when only the silent channel is left', async () => {
            userService.getOneActive.mockResolvedValue(user);
            notificationService.getListUserSetting.mockResolvedValue([setting]);
            deviceService.getNotificationTokens.mockResolvedValue([]);
            notificationUtil.resolveChannels.mockReturnValue([]);

            const result = await useCase.execute('outbox-id', data);

            expect(
                notificationService.toRecipientRecord
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
            });
        });
    });
});
