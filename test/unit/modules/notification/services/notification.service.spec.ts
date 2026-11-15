import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    Notification,
    NotificationUserSetting,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
    EnumUserReauthenticationAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationEmailProcess,
    EnumNotificationProcess,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type {
    INotificationPublishTermPolicyInput,
    INotificationPublishTermPolicyPayload,
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationSnapshot,
    INotificationWorkspaceInviteContext,
    INotificationWorkspaceInviteFields,
} from '@modules/notification/interfaces/notification.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ConfigService } from '@nestjs/config';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('NotificationService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    let service: NotificationService;

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.normal,
        title: 'Login',
        body: 'Login from web',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const setting: NotificationUserSetting = {
        id: 'setting-id',
        userId: 'user-id',
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const configValues: Record<string, string> = {
        'notification.idempotencyKey.userPattern': '{process}-{userId}',
        'notification.idempotencyKey.referencePattern': '{process}-{reference}',
        'notification.idempotencyKey.joinRequestPattern':
            '{process}-{joinRequestId}-{userId}',
        'notification.idempotencyKey.userTermPolicyPattern':
            '{process}-{userId}-{termPolicyId}',
        'notification.idempotencyKey.termPolicyPublishPattern':
            '{process}-{termPolicyId}',
        'notification.idempotencyKey.termPolicyResendPattern':
            '{process}-{termPolicyId}-{resendNonce}',
        'notification.idempotencyKey.stepPattern': '{notificationId}-{step}',
    };

    const publishPayload: INotificationPublishTermPolicyPayload = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        resendNonce: null,
    };

    const invitePayload: INotificationWorkspaceInviteFields = {
        workspaceId: 'workspace-id',
        workspaceName: 'Acme',
        inviterName: 'Alice',
        reference: 'WI-ref',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
        inviteAcceptLink: 'https://app.test/invite/token',
    };

    const inviteContext: INotificationWorkspaceInviteContext = {
        userId: 'user-id',
        proceedBy: 'actor-id',
        workspaceId: 'workspace-id',
        workspaceName: 'Acme',
        inviterName: 'Alice',
        reference: 'WI-ref',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
        inviteAcceptLink: 'https://app.test/invite/token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation(
            (key: string) => configValues[key]
        );
        const module = await Test.createTestingModule({
            providers: [
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: DeviceService, useValue: deviceService },
                { provide: MessageService, useValue: messageService },
                NotificationService,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: NotificationUserSettingRepository,
                    useValue: notificationUserSettingRepository,
                },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        service = module.get(NotificationService);
    });

    describe('notify', () => {
        it('returns no idempotency key for a kind that may repeat', () => {
            const result = service.notify(EnumNotificationKind.changePassword, {
                userId: 'user-id',
                proceedBy: 'user-id',
            });

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.changePassword,
                    context: { userId: 'user-id', proceedBy: 'user-id' },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
            expect(helperStringService.fillPattern).not.toHaveBeenCalled();
            expect(notificationUtil.encryptPayload).not.toHaveBeenCalled();
        });

        it('returns the reauthentication code effect with the code sealed against the recipient and no idempotency key', () => {
            notificationUtil.toSealedField.mockReturnValue('encryptedOtp');
            notificationUtil.encryptPayload.mockReturnValue('encrypted-otp');

            const result = service.notify(
                EnumNotificationKind.reauthenticationOtp,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    verificationId: 'verification-id',
                    otp: '482913',
                    action: EnumUserReauthenticationAction.deleteSelf,
                    expiredInMinutes: 5,
                }
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.reauthenticationOtp,
                    context: {
                        userId: 'user-id',
                        proceedBy: 'user-id',
                        verificationId: 'verification-id',
                        encryptedOtp: 'encrypted-otp',
                        action: EnumUserReauthenticationAction.deleteSelf,
                        expiredInMinutes: 5,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
            expect(notificationUtil.encryptPayload).toHaveBeenCalledWith(
                '482913',
                'user-id'
            );
            expect(helperStringService.fillPattern).not.toHaveBeenCalled();
        });

        it('returns the login locked effect with the context and no idempotency key', () => {
            const context = {
                userId: 'user-id',
                proceedBy: 'user-id',
                method: EnumNotificationLoginLockedMethod.password,
                methodLabel: 'Password',
                lockedUntil: '2026-01-01T00:15:00.000Z',
            };

            const result = service.notify(
                EnumNotificationKind.loginLocked,
                context
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.loginLocked,
                    context,
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
            expect(helperStringService.fillPattern).not.toHaveBeenCalled();
            expect(notificationUtil.encryptPayload).not.toHaveBeenCalled();
        });

        it('returns the notify effect with the link sealed against the recipient and the reference key', () => {
            notificationUtil.toSealedField.mockReturnValue(
                'encryptedInviteAcceptLink'
            );
            notificationUtil.encryptPayload.mockReturnValue('encrypted-link');
            helperStringService.fillPattern.mockReturnValue(
                'workspaceInvite-WI-ref'
            );

            const result = service.notify(
                EnumNotificationKind.workspaceInvite,
                inviteContext
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
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
                        encryptedInviteAcceptLink: 'encrypted-link',
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'workspaceInvite-WI-ref',
            });
            expect(notificationUtil.encryptPayload).toHaveBeenCalledWith(
                'https://app.test/invite/token',
                'user-id'
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{reference}',
                expect.objectContaining({
                    process: EnumNotificationKind.workspaceInvite,
                    reference: 'WI-ref',
                })
            );
        });

        it('returns the userImportResult effect on the notification queue keyed by the import row id with the counts and reasons unsealed', () => {
            helperStringService.fillPattern.mockReturnValue(
                'userImportResult-outbox-id'
            );

            const result = service.notify(
                EnumNotificationKind.userImportResult,
                {
                    userId: 'admin-id',
                    proceedBy: 'admin-id',
                    reference: 'outbox-id',
                    created: 0,
                    failed: 2,
                    reasons: ['Username already exists.'],
                }
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.userImportResult,
                    context: {
                        userId: 'admin-id',
                        proceedBy: 'admin-id',
                        reference: 'outbox-id',
                        created: 0,
                        failed: 2,
                        reasons: ['Username already exists.'],
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'userImportResult-outbox-id',
            });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{reference}',
                {
                    process: EnumNotificationKind.userImportResult,
                    userId: 'admin-id',
                    proceedBy: 'admin-id',
                    reference: 'outbox-id',
                }
            );
            expect(notificationUtil.encryptPayload).not.toHaveBeenCalled();
        });

        it('leaves a non-string context field out of the idempotency key values', () => {
            helperStringService.fillPattern.mockReturnValue(
                'userAcceptTermPolicy-user-id-term-policy-id'
            );

            service.notify(EnumNotificationKind.userAcceptTermPolicy, {
                userId: 'user-id',
                proceedBy: 'user-id',
                termPolicyId: 'term-policy-id',
                type: EnumTermPolicyType.privacy,
                version: 3,
            });

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{userId}-{termPolicyId}',
                {
                    process: EnumNotificationKind.userAcceptTermPolicy,
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    termPolicyId: 'term-policy-id',
                    type: EnumTermPolicyType.privacy,
                }
            );
        });
    });

    describe('notifyUnregisteredInvite', () => {
        it('returns the unregistered email effect with the address and link sealed against the reference', () => {
            notificationUtil.toSealedField.mockReturnValue(
                'encryptedInviteAcceptLink'
            );
            notificationUtil.encryptPayload
                .mockReturnValueOnce('encrypted-email')
                .mockReturnValueOnce('encrypted-link');
            helperStringService.fillPattern.mockReturnValue(
                'sendUnregistered-WI-ref'
            );

            const result = service.notifyUnregisteredInvite(
                'invitee@example.com',
                invitePayload
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationEmail,
                name: EnumNotificationEmailProcess.sendUnregistered,
                data: {
                    encryptedEmail: 'encrypted-email',
                    context: {
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                        reference: 'WI-ref',
                        workspaceMemberRole: EnumWorkspaceMemberRole.member,
                        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
                        encryptedInviteAcceptLink: 'encrypted-link',
                    },
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'sendUnregistered-WI-ref',
            });
            expect(notificationUtil.encryptPayload).toHaveBeenNthCalledWith(
                1,
                'invitee@example.com',
                'WI-ref'
            );
            expect(notificationUtil.encryptPayload).toHaveBeenNthCalledWith(
                2,
                'https://app.test/invite/token',
                'WI-ref'
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{reference}',
                {
                    process: EnumNotificationEmailProcess.sendUnregistered,
                    reference: 'WI-ref',
                }
            );
        });
    });

    describe('toRecipientRecord', () => {
        it('returns the recipient with the address and each distinct token encrypted against the user id', () => {
            const user: IUserRecipient = {
                id: 'user-id',
                email: 'user@example.com',
                username: 'user',
            };
            notificationUtil.encryptPayload.mockImplementation(
                (value: string) => `cipher(${value})`
            );

            const result = service.toRecipientRecord(
                user,
                ['token-1', 'token-1', 'token-2'],
                [EnumNotificationChannel.email]
            );

            expect(result).toEqual({
                userId: 'user-id',
                username: 'user',
                encryptedEmail: 'cipher(user@example.com)',
                encryptedTokens: ['cipher(token-1)', 'cipher(token-2)'],
                channels: [EnumNotificationChannel.email],
            });
            expect(notificationUtil.encryptPayload).toHaveBeenCalledWith(
                'user@example.com',
                'user-id'
            );
        });
    });

    describe('getSnapshot', () => {
        it('returns the username with the address and each distinct live-session token encrypted against the user id', async () => {
            const user: IUserRecipient = {
                id: 'user-id',
                email: 'user@example.com',
                username: 'user',
            };
            deviceService.getNotificationTokens.mockResolvedValue([
                'token-1',
                'token-1',
                'token-2',
            ]);
            notificationUtil.encryptPayload.mockImplementation(
                (value: string) => `cipher(${value})`
            );

            const result = await service.getSnapshot(user);

            expect(result).toEqual({
                username: 'user',
                encryptedEmail: 'cipher(user@example.com)',
                encryptedTokens: ['cipher(token-1)', 'cipher(token-2)'],
            });
            expect(deviceService.getNotificationTokens).toHaveBeenCalledWith(
                'user-id'
            );
            expect(notificationUtil.encryptPayload).toHaveBeenCalledWith(
                'token-2',
                'user-id'
            );
        });
    });

    describe('toSnapshotRecipientRecord', () => {
        it('returns the snapshot as the recipient with every channel the kind lists, settings ignored', () => {
            const snapshot: INotificationSnapshot = {
                username: 'user',
                encryptedEmail: 'cipher(user@example.com)',
                encryptedTokens: ['cipher(token-1)'],
            };
            const channels = [
                EnumNotificationChannel.email,
                EnumNotificationChannel.push,
                EnumNotificationChannel.silent,
            ];
            notificationUtil.resolveChannels.mockReturnValue(channels);

            const result = service.toSnapshotRecipientRecord(
                EnumNotificationKind.resetPassword,
                'user-id',
                snapshot
            );

            expect(result).toEqual({
                userId: 'user-id',
                username: 'user',
                encryptedEmail: 'cipher(user@example.com)',
                encryptedTokens: ['cipher(token-1)'],
                channels,
            });
            expect(notificationUtil.resolveChannels).toHaveBeenCalledWith(
                EnumNotificationKind.resetPassword,
                []
            );
        });
    });

    describe('createInTx', () => {
        const tx: IDatabaseTransactionClient =
            mock<IDatabaseTransactionClient>();
        const recipient: INotificationRecipientRecord = {
            userId: 'user-id',
            username: 'invitee',
            encryptedEmail: 'encrypted-email',
            encryptedTokens: ['encrypted-token'],
            channels: [
                EnumNotificationChannel.email,
                EnumNotificationChannel.push,
                EnumNotificationChannel.inApp,
            ],
        };
        const sealedContext: INotificationSealedData = {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceName: 'Acme',
            encryptedInviteAcceptLink: 'encrypted-link',
        };

        it('creates the notification and adds an email and a push row on the same tx', async () => {
            notificationUtil.toMetadata.mockReturnValue({
                username: 'invitee',
            });
            helperStringService.fillPattern.mockImplementation(
                (_pattern: string, values: Record<string, string>) =>
                    `${values.notificationId}-${values.step}`
            );

            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                recipient
            );

            expect(notificationUtil.toMetadata).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                'invitee'
            );
            expect(notificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                EnumNotificationKind.workspaceInvite,
                {
                    id: 'notification-id',
                    userId: 'user-id',
                    metadata: { username: 'invitee' },
                    createdBy: 'actor-id',
                    channels: recipient.channels,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumNotificationQueue.notificationEmail,
                    name: EnumNotificationEmailProcess.send,
                    data: {
                        kind: EnumNotificationKind.workspaceInvite,
                        notificationId: 'notification-id',
                        userId: 'user-id',
                        username: 'invitee',
                        encryptedEmail: 'encrypted-email',
                        context: sealedContext,
                        completedSteps: [],
                    },
                    priority: EnumQueuePriority.medium,
                    idempotencyKey: 'notification-id-sendEmail',
                },
                {
                    queue: EnumNotificationQueue.notificationPush,
                    name: EnumNotificationPushProcess.send,
                    data: {
                        kind: EnumNotificationKind.workspaceInvite,
                        notificationId: 'notification-id',
                        userId: 'user-id',
                        username: 'invitee',
                        encryptedTokens: ['encrypted-token'],
                        context: sealedContext,
                        completedSteps: [],
                        encryptedPendingTokens: null,
                        encryptedFailureTokens: null,
                    },
                    priority: EnumQueuePriority.medium,
                    idempotencyKey: 'notification-id-sendPush',
                },
            ]);
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{notificationId}-{step}',
                { notificationId: 'notification-id', step: 'sendEmail' }
            );
        });

        it('adds no push row for a recipient with no token', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                { ...recipient, encryptedTokens: [] }
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    name: EnumNotificationEmailProcess.send,
                }),
            ]);
        });

        it('adds no channel row when the channels hold neither email nor push', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                { ...recipient, channels: [EnumNotificationChannel.inApp] }
            );

            expect(notificationRepository.createInTx).toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds the email row for a kind with no template fields when the recipient has an address', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.welcome,
                sealedContext,
                { ...recipient, encryptedTokens: [] }
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    name: EnumNotificationEmailProcess.send,
                }),
            ]);
        });
    });

    describe('cleanupTokensEffect', () => {
        it('returns the push cleanup effect for the failure tokens', () => {
            const result = service.cleanupTokensEffect('user-id', [
                'encrypted-token',
            ]);

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationPush,
                name: EnumNotificationPushProcess.cleanupTokens,
                data: {
                    userId: 'user-id',
                    encryptedFailureTokens: ['encrypted-token'],
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });

    describe('publishTermPolicyEffect', () => {
        it('returns the main queue effect keyed by the term policy', () => {
            helperStringService.fillPattern.mockReturnValue(
                'publishTermPolicy-term-policy-id'
            );

            const result = service.publishTermPolicyEffect(
                publishPayload,
                'admin-id'
            );

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}',
                {
                    process: EnumNotificationProcess.publishTermPolicy,
                    termPolicyId: 'term-policy-id',
                }
            );
            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.publishTermPolicy,
                data: { proceedBy: 'admin-id', data: publishPayload },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'publishTermPolicy-term-policy-id',
            });
        });
    });

    describe('resendPublishTermPolicyEffect', () => {
        const resendInput: INotificationPublishTermPolicyInput = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 1,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        };

        it('draws a nonce into the data and the key', () => {
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'resendPublishTermPolicy-term-policy-id-nonce-1'
            );

            const result = service.resendPublishTermPolicyEffect(
                resendInput,
                'admin-id'
            );

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}-{resendNonce}',
                {
                    process: EnumNotificationProcess.resendPublishTermPolicy,
                    termPolicyId: 'term-policy-id',
                    resendNonce: 'nonce-1',
                }
            );
            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.resendPublishTermPolicy,
                data: {
                    proceedBy: 'admin-id',
                    data: { ...resendInput, resendNonce: 'nonce-1' },
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey:
                    'resendPublishTermPolicy-term-policy-id-nonce-1',
            });
        });

        it('returns a distinct key for each call', () => {
            databaseUtil.createId
                .mockReturnValueOnce('nonce-1')
                .mockReturnValueOnce('nonce-2');
            helperStringService.fillPattern.mockImplementation(
                (_pattern, values) => `${values.process}-${values.resendNonce}`
            );

            const first = service.resendPublishTermPolicyEffect(
                resendInput,
                'admin-id'
            );
            const second = service.resendPublishTermPolicyEffect(
                resendInput,
                'admin-id'
            );

            expect(first.idempotencyKey).toBe(
                'resendPublishTermPolicy-nonce-1'
            );
            expect(second.idempotencyKey).toBe(
                'resendPublishTermPolicy-nonce-2'
            );
        });
    });

    describe('getListCursor', () => {
        it('returns the paginated notification list from the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    limit: 20,
                    orderBy: [],
                };
            const paginationResult = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [notification],
                cursor: 'next-cursor',
            };
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                []
            );
            notificationRepository.findWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListCursor('user-id', pagination);

            expect(result).toBe(paginationResult);
            expect(
                notificationRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination, []);
        });

        it('passes the types the user disabled for inApp so the repository excludes them', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    limit: 20,
                    orderBy: [],
                };
            const settings: NotificationUserSetting[] = [
                {
                    ...setting,
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.userActivity,
                    isActive: false,
                },
                {
                    ...setting,
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.marketing,
                    isActive: true,
                },
                {
                    ...setting,
                    channel: EnumNotificationChannel.email,
                    type: EnumNotificationType.marketing,
                    isActive: false,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );
            notificationRepository.findWithPaginationCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await service.getListCursor('user-id', pagination);

            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(
                notificationRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination, [
                EnumNotificationType.userActivity,
            ]);
        });
    });

    describe('getListUserSetting', () => {
        it('returns the stored user settings filtered to the configurable pairs', async () => {
            const settings: NotificationUserSetting[] = [
                {
                    id: 'setting-id',
                    userId: 'user-id',
                    channel: EnumNotificationChannel.email,
                    type: EnumNotificationType.userActivity,
                    isActive: true,
                    createdAt: new Date('2024-01-01T00:00:00.000Z'),
                    createdBy: 'user-id',
                    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );

            const result = await service.getListUserSetting('user-id');

            expect(result).toEqual(settings);
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
        });
    });

    describe('markAsRead', () => {
        it('reads the row first, then marks it with one guarded write', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: false,
            });
            notificationRepository.markAsRead.mockResolvedValue(true);

            await service.markAsRead('user-id', 'notification-id');

            expect(notificationRepository.findIsReadById).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
            expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
                'notification-id',
                'user-id'
            );
        });

        it('throws NotificationNotFoundException when the notification does not exist and never writes', async () => {
            notificationRepository.findIsReadById.mockResolvedValue(null);

            await expect(
                service.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationNotFoundException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.notFound,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.notFound
                    ],
                messagePath: 'notification.error.notFound',
            });
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the row is already read and never writes', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: true,
            });

            await expect(
                service.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationAlreadyReadException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.alreadyRead
                    ],
                messagePath: 'notification.error.alreadyRead',
            });
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the guarded write misses after the read', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                isRead: false,
            });
            notificationRepository.markAsRead.mockResolvedValue(false);

            await expect(
                service.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationAlreadyReadException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.alreadyRead
                    ],
                messagePath: 'notification.error.alreadyRead',
            });
        });
    });

    describe('markAllAsRead', () => {
        it('passes the muted in-app types to the repository and returns the count', async () => {
            const settings = [
                {
                    id: 'setting-id',
                    userId: 'user-id',
                    channel: EnumNotificationChannel.inApp,
                    type: EnumNotificationType.userActivity,
                    isActive: false,
                    createdAt: new Date('2024-01-01T00:00:00.000Z'),
                    createdBy: 'user-id',
                    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            ];
            notificationUserSettingRepository.findUserSetting.mockResolvedValue(
                settings
            );
            notificationRepository.markAllAsRead.mockResolvedValue({
                count: 3,
            });

            const result = await service.markAllAsRead('user-id');

            expect(result).toBe(3);
            expect(
                notificationUserSettingRepository.findUserSetting
            ).toHaveBeenCalledWith('user-id');
            expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
                'user-id',
                [EnumNotificationType.userActivity]
            );
        });
    });

    describe('updateUserSetting', () => {
        const tx = {} as IDatabaseTransactionClient;
        const requestContext: IRequestContext = {
            requestLog: {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: null,
                    device: null,
                    engine: null,
                    os: null,
                },
                ipAddress: '127.0.0.1',
                geoLocation: null,
            },
            language: 'en',
        };
        const apiKeyContext = buildApiKeyContext();
        const authContext = buildAuthJwtAccessContext('user-id');
        const entryEffect: IActivityLogCreateManyEffect = {
            queue: EnumActivityLogQueue.activityLog,
            name: EnumActivityLogProcess.createMany,
            data: { rows: [] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };

        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        const data = {
            channel: EnumNotificationChannel.email,
            type: EnumNotificationType.userActivity,
            isActive: false,
        };

        it('throws NotificationInvalidTypeException before writing when the type is not configurable', async () => {
            await expect(
                service.updateUserSetting(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    {
                        ...data,
                        type: EnumNotificationType.securityAlert,
                    }
                )
            ).rejects.toMatchObject({
                constructor: NotificationInvalidTypeException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidType,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidType
                    ],
                messagePath: 'notification.error.invalidType',
            });
            expect(
                notificationUserSettingRepository.updateUserSettingInTx
            ).not.toHaveBeenCalled();
        });

        it('throws NotificationInvalidChannelException before writing when the channel is not allowed for the type', async () => {
            await expect(
                service.updateUserSetting(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    {
                        ...data,
                        type: EnumNotificationType.marketing,
                        channel: EnumNotificationChannel.inApp,
                    }
                )
            ).rejects.toMatchObject({
                constructor: NotificationInvalidChannelException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidChannel
                    ],
                messagePath: 'notification.error.invalidChannel',
            });
            expect(
                notificationUserSettingRepository.updateUserSettingInTx
            ).not.toHaveBeenCalled();
        });

        it('writes the setting', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                true
            );

            await service.updateUserSetting(
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(
                notificationUserSettingRepository.updateUserSettingInTx
            ).toHaveBeenCalledWith(tx, 'user-id', data);
        });

        it('adds the userUpdateNotificationSetting entry from the passed context on the same tx after the write', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                true
            );

            await service.updateUserSetting(
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userUpdateNotificationSetting,
                    metadata: {
                        channel: data.channel,
                        type: data.type,
                        isActive: data.isActive,
                    },
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('adds no entry when the setting row does not exist', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                false
            );

            await expect(
                service.updateUserSetting(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toBeInstanceOf(NotificationSettingInvalidException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws NotificationSettingInvalidException when the setting row does not exist', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                false
            );

            await expect(
                service.updateUserSetting(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toMatchObject({
                constructor: NotificationSettingInvalidException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.settingInvalid,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.settingInvalid
                    ],
                messagePath: 'notification.error.settingInvalid',
            });
        });
    });

    describe('createDefaultsManyInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('creates the default settings of every user in one repository statement', async () => {
            await service.createDefaultsManyInTx(tx, ['user-one', 'user-two']);

            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-one', 'user-two']);
        });

        it('issues no statement for an empty list', async () => {
            await service.createDefaultsManyInTx(tx, []);

            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('validateUserSetting', () => {
        it('does not throw when the type and channel combination is allowed', () => {
            expect(() =>
                service.validateUserSetting(
                    EnumNotificationType.userActivity,
                    EnumNotificationChannel.email
                )
            ).not.toThrow();
        });

        it('throws NotificationInvalidTypeException when the type is not in the contract', () => {
            let captured: unknown;
            try {
                service.validateUserSetting(
                    EnumNotificationType.securityAlert,
                    EnumNotificationChannel.email
                );
            } catch (err: unknown) {
                captured = err;
            }

            expect(captured).toMatchObject({
                constructor: NotificationInvalidTypeException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidType,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidType
                    ],
                messagePath: 'notification.error.invalidType',
            });
        });

        it('throws NotificationInvalidChannelException when the channel is not allowed for the type', () => {
            let captured: unknown;
            try {
                service.validateUserSetting(
                    EnumNotificationType.marketing,
                    EnumNotificationChannel.inApp
                );
            } catch (err: unknown) {
                captured = err;
            }

            expect(captured).toMatchObject({
                constructor: NotificationInvalidChannelException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidChannel
                    ],
                messagePath: 'notification.error.invalidChannel',
            });
        });
    });

    describe('decryptFailureTokens', () => {
        it('decrypts each failure token with the user id', () => {
            notificationUtil.decryptPayload.mockImplementation(
                (encrypted: string) =>
                    encrypted.replace(/^cipher\((.*)\)$/, '$1')
            );

            expect(
                service.decryptFailureTokens('user-id', [
                    'cipher(token-1)',
                    'cipher(token-2)',
                ])
            ).toEqual(['token-1', 'token-2']);
            expect(notificationUtil.decryptPayload).toHaveBeenCalledWith(
                'cipher(token-2)',
                'user-id'
            );
        });

        it('rethrows a decryption failure', () => {
            const failure = new Error('decrypt');
            notificationUtil.decryptPayload.mockImplementation(() => {
                throw failure;
            });

            expect(() =>
                service.decryptFailureTokens('user-id', ['cipher(token-1)'])
            ).toThrow(failure);
        });
    });

    describe('toCleanupTokensResult', () => {
        it('reports the requested and removed counts', () => {
            expect(service.toCleanupTokensResult(2, 1)).toEqual({
                message: 'notification.queue.push.cleanupTokens',
                countRequestedTokens: 2,
                countRemovedTokens: 1,
            });
        });
    });

    describe('toCleanupStaleTokensResult', () => {
        it('reports the removed count', () => {
            expect(service.toCleanupStaleTokensResult(5)).toEqual({
                message: 'notification.queue.push.cleanupStaleTokens',
                countRemovedTokens: 5,
            });
        });
    });

    describe('toMessageProperties', () => {
        const title = 'notification.notify.welcome.title';

        beforeEach(() => {
            notificationUtil.toDisplayProperties.mockImplementation(
                (_kind, properties) => properties
            );
        });

        it('keeps only the primitive metadata values', () => {
            expect(
                service.toMessageProperties(title, {
                    username: 'ana',
                    age: 3,
                    isNew: true,
                    nested: { a: 1 },
                    list: [1],
                    missing: null,
                })
            ).toEqual({ username: 'ana', age: 3, isNew: true });
        });

        it('formats the date fields of the kind the title belongs to', () => {
            notificationUtil.toDisplayProperties.mockReturnValue({
                username: 'ana',
                loginAt: 'Sun, 01 Mar 2026 00:05:00 +0000',
            });

            const result = service.toMessageProperties(
                NotificationKindContract[EnumNotificationKind.newDeviceLogin]
                    .title,
                { username: 'ana', loginAt: '2026-03-01T00:05:00.000Z' }
            );

            expect(notificationUtil.toDisplayProperties).toHaveBeenCalledWith(
                EnumNotificationKind.newDeviceLogin,
                { username: 'ana', loginAt: '2026-03-01T00:05:00.000Z' }
            );
            expect(result).toEqual({
                username: 'ana',
                loginAt: 'Sun, 01 Mar 2026 00:05:00 +0000',
            });
        });

        it('keeps the properties as they are for a title no contract row owns', () => {
            const result = service.toMessageProperties(
                'notification.notify.unknown.title',
                { username: 'ana' }
            );

            expect(result).toEqual({ username: 'ana' });
            expect(notificationUtil.toDisplayProperties).not.toHaveBeenCalled();
        });

        it('returns empty properties for null metadata', () => {
            expect(service.toMessageProperties(title, null)).toEqual({});
        });

        it('returns empty properties for array metadata', () => {
            expect(service.toMessageProperties(title, ['ana'])).toEqual({});
        });

        it('returns empty properties for primitive metadata', () => {
            expect(service.toMessageProperties(title, 'ana')).toEqual({});
        });
    });

    describe('toRejectReasonProperties', () => {
        it('adds the reject reason label translated in the request language', () => {
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            expect(
                service.toRejectReasonProperties(
                    { username: 'ana', rejectReasonCode: 'spam' },
                    'en'
                )
            ).toEqual({
                username: 'ana',
                rejectReasonCode: 'spam',
                rejectReasonLabel: 'translated:notification.rejectReason.spam',
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.spam',
                { customLanguage: 'en' }
            );
        });

        it('translates the label with no custom language when none is given', () => {
            service.toRejectReasonProperties(
                { rejectReasonCode: 'spam' },
                null
            );

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.spam',
                {}
            );
        });

        it('returns the properties untouched when no reject reason code is a string', () => {
            const properties = { username: 'ana', rejectReasonCode: 3 };

            expect(service.toRejectReasonProperties(properties, 'en')).toBe(
                properties
            );
            expect(messageService.setMessage).not.toHaveBeenCalled();
        });
    });

    describe('listConfigurableSettings', () => {
        it('keeps the contract pairs and drops every other pair', () => {
            const kept = [
                {
                    ...setting,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...setting,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.inApp,
                },
                {
                    ...setting,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.push,
                },
                {
                    ...setting,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...setting,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.push,
                },
            ];
            const dropped = [
                {
                    ...setting,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.silent,
                },
                {
                    ...setting,
                    type: EnumNotificationType.securityAlert,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...setting,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.inApp,
                },
            ];

            const result = service['listConfigurableSettings']([
                ...dropped,
                ...kept,
            ]);

            expect(result).toEqual(kept);
        });
    });

    describe('listMutedInAppTypes', () => {
        it('returns the types whose inApp setting is inactive', () => {
            expect(
                service['listMutedInAppTypes']([
                    {
                        type: EnumNotificationType.userActivity,
                        channel: EnumNotificationChannel.inApp,
                        isActive: false,
                    },
                    {
                        type: EnumNotificationType.marketing,
                        channel: EnumNotificationChannel.email,
                        isActive: false,
                    },
                    {
                        type: EnumNotificationType.securityAlert,
                        channel: EnumNotificationChannel.inApp,
                        isActive: true,
                    },
                ])
            ).toEqual([EnumNotificationType.userActivity]);
        });
    });
});
