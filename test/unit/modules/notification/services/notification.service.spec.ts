import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildSealedNotificationPayload,
    buildSealedNotificationPayloads,
    buildUnsealedNotificationPayload,
    buildUnsealedNotificationPayloads,
} from '@test/unit/helpers/test.unit.notification-push.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
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
} from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKind,
    EnumNotificationEmailProcess,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
    EnumNotificationSmsProcess,
} from '@modules/notification/enums/notification.enum';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { MessageService } from '@common/message/services/message.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type {
    INotificationEmailSendEffect,
    INotificationPushSendEffect,
    INotificationSmsSendEffect,
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationSnapshot,
} from '@modules/notification/interfaces/notification.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ConfigService } from '@nestjs/config';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('NotificationService', () => {
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const notificationSmsQueue: MockProxy<NotificationSmsQueue> =
        mock<NotificationSmsQueue>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
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
        'notification.idempotencyKey.stepPattern': '{process}-{notificationId}',
        'notification.idempotencyKey.termPolicyBatchPattern':
            '{process}-{termPolicyId}-{batchId}',
        'notification.idempotencyKey.termPolicyBatchResendPattern':
            '{process}-{termPolicyId}-{batchId}-{resendNonce}',
    };

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
                {
                    provide: NotificationSmsQueue,
                    useValue: notificationSmsQueue,
                },
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
                NotificationUtil,
            ],
        }).compile();
        service = module.get(NotificationService);
    });

    describe('toRecipientRecord', () => {
        it('returns the recipient with the address and each distinct token encrypted against the user id', () => {
            const user: IUserRecipient = {
                id: 'user-id',
                email: 'user@example.com',
                username: 'user',
                name: null,
            };

            const result = service.toRecipientRecord(
                user,
                ['token-1', 'token-1', 'token-2'],
                null,
                [EnumNotificationChannel.email]
            );

            expect(result).toEqual({
                userId: 'user-id',
                username: 'user',
                encryptedEmail: expect.any(String),
                encryptedTokens: [expect.any(String), expect.any(String)],
                encryptedMobileNumber: null,
                channels: [EnumNotificationChannel.email],
            });
            expect(
                buildUnsealedNotificationPayload(
                    result.encryptedEmail,
                    'user-id'
                )
            ).toBe('user@example.com');
            expect(
                buildUnsealedNotificationPayloads(
                    result.encryptedTokens,
                    'user-id'
                )
            ).toEqual(['token-1', 'token-2']);
        });

        it('encrypts the mobile number against the user id when one is given', () => {
            const user: IUserRecipient = {
                id: 'user-id',
                email: 'user@example.com',
                username: 'user',
                name: null,
            };

            const result = service.toRecipientRecord(
                user,
                [],
                '+6281234567890',
                [EnumNotificationChannel.sms]
            );

            expect(
                buildUnsealedNotificationPayload(
                    String(result.encryptedMobileNumber),
                    'user-id'
                )
            ).toBe('+6281234567890');
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
                encryptedMobileNumber: null,
                channels,
            });
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
            encryptedMobileNumber: null,
            channels: [
                EnumNotificationChannel.email,
                EnumNotificationChannel.push,
                EnumNotificationChannel.inApp,
            ],
        };
        const sealedContext: INotificationSealedData = {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            encryptedInviteAcceptLink: 'encrypted-link',
            snapshot: null,
            verificationId: null,
        };
        const emailEffect = {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.send,
        } as INotificationEmailSendEffect;
        const pushEffect = {
            queue: EnumNotificationQueue.notificationPush,
            name: EnumNotificationPushProcess.send,
        } as INotificationPushSendEffect;
        const smsEffect = {
            queue: EnumNotificationQueue.notificationSms,
            name: EnumNotificationSmsProcess.send,
        } as INotificationSmsSendEffect;

        beforeEach(() => {
            notificationEmailQueue.sendEffect.mockReturnValue(emailEffect);
            notificationPushQueue.sendEffect.mockReturnValue(pushEffect);
            notificationSmsQueue.sendEffect.mockReturnValue(smsEffect);
        });

        it('stores the sealed secret field in the metadata and no plain value', async () => {
            const sealedMobileNumber = buildSealedNotificationPayload(
                '+6281234567890',
                'user-id'
            );

            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.verifiedMobileNumber,
                {
                    userId: 'user-id',
                    proceedBy: 'actor-id',
                    reference: 'VRF-abc',
                    encryptedMobileNumber: sealedMobileNumber,
                    snapshot: null,
                    verificationId: null,
                },
                recipient,
                true
            );

            expect(notificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                EnumNotificationKind.verifiedMobileNumber,
                expect.objectContaining({
                    metadata: {
                        username: 'invitee',
                        encryptedMobileNumber: sealedMobileNumber,
                    },
                })
            );
        });

        it('creates the notification and adds the email and push effects its queue classes return on the same tx', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                recipient,
                true
            );

            expect(notificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                EnumNotificationKind.workspaceInvite,
                {
                    id: 'notification-id',
                    userId: 'user-id',
                    metadata: {
                        username: 'invitee',
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                    },
                    createdBy: 'actor-id',
                    channels: recipient.channels,
                }
            );
            expect(notificationEmailQueue.sendEffect).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                'notification-id',
                sealedContext,
                recipient
            );
            expect(notificationPushQueue.sendEffect).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                'notification-id',
                sealedContext,
                recipient
            );
            expect(notificationSmsQueue.sendEffect).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                emailEffect,
                pushEffect,
            ]);
        });

        it('adds no push effect for a recipient with no token', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                { ...recipient, encryptedTokens: [] },
                true
            );

            expect(notificationPushQueue.sendEffect).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                emailEffect,
            ]);
        });

        it('creates the notification through the absent-guarded repository method when it is not fresh', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                recipient,
                false
            );

            expect(
                notificationRepository.createIfAbsentInTx
            ).toHaveBeenCalledWith(
                tx,
                EnumNotificationKind.workspaceInvite,
                expect.objectContaining({
                    id: 'notification-id',
                    userId: 'user-id',
                    createdBy: 'actor-id',
                })
            );
            expect(notificationRepository.createInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                emailEffect,
                pushEffect,
            ]);
        });

        it('adds no channel effect when the channels hold neither email nor push', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                { ...recipient, channels: [EnumNotificationChannel.inApp] },
                true
            );

            expect(notificationRepository.createInTx).toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds the sms effect with the number when the channels hold sms and the recipient has a number', async () => {
            const smsContext: INotificationSealedData = {
                userId: 'user-id',
                proceedBy: 'user-id',
                verificationId: 'verification-id',
                reference: 'VRF-abc',
                expiredInMinutes: 5,
                encryptedOtp: 'encrypted-otp',
                snapshot: null,
            };
            const smsRecipient: INotificationRecipientRecord = {
                ...recipient,
                encryptedMobileNumber: 'encrypted-number',
                channels: [
                    EnumNotificationChannel.sms,
                    EnumNotificationChannel.silent,
                ],
            };

            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.verificationMobileNumber,
                smsContext,
                smsRecipient,
                true
            );

            expect(notificationSmsQueue.sendEffect).toHaveBeenCalledWith(
                EnumNotificationKind.verificationMobileNumber,
                'notification-id',
                smsContext,
                smsRecipient,
                'encrypted-number'
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                smsEffect,
            ]);
        });

        it('adds no sms effect when the recipient has no number', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.verificationMobileNumber,
                sealedContext,
                {
                    ...recipient,
                    channels: [
                        EnumNotificationChannel.sms,
                        EnumNotificationChannel.silent,
                    ],
                },
                true
            );

            expect(notificationRepository.createInTx).toHaveBeenCalled();
            expect(notificationSmsQueue.sendEffect).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds no sms effect when the channels do not hold sms', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.workspaceInvite,
                sealedContext,
                {
                    ...recipient,
                    encryptedMobileNumber: 'encrypted-number',
                    channels: [EnumNotificationChannel.inApp],
                },
                true
            );

            expect(notificationSmsQueue.sendEffect).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds the email effect for a kind with no template fields when the recipient has an address', async () => {
            await service.createInTx(
                tx,
                'notification-id',
                EnumNotificationKind.welcome,
                sealedContext,
                { ...recipient, encryptedTokens: [] },
                true
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                emailEffect,
            ]);
        });
    });

    describe('createManyInTx', () => {
        const tx: IDatabaseTransactionClient =
            mock<IDatabaseTransactionClient>();
        const metadata = { type: EnumTermPolicyType.privacy, version: 1 };

        it('forwards one entry per recipient with the contract channels on the same tx', async () => {
            const { pendingChannels, deliveredChannels } =
                NotificationKindContract.publishTermPolicy;
            const channels = [...pendingChannels, ...deliveredChannels];

            await service.createManyInTx(
                tx,
                EnumNotificationKind.publishTermPolicy,
                metadata,
                'admin-id',
                [
                    { userId: 'u1', notificationId: 'n-1' },
                    { userId: 'u2', notificationId: 'n-2' },
                ]
            );

            expect(
                notificationRepository.createManyInTx
            ).toHaveBeenCalledExactlyOnceWith(tx, [
                {
                    kind: EnumNotificationKind.publishTermPolicy,
                    payload: {
                        id: 'n-1',
                        userId: 'u1',
                        metadata,
                        createdBy: 'admin-id',
                        channels,
                    },
                },
                {
                    kind: EnumNotificationKind.publishTermPolicy,
                    payload: {
                        id: 'n-2',
                        userId: 'u2',
                        metadata,
                        createdBy: 'admin-id',
                        channels,
                    },
                },
            ]);
        });
    });

    describe('markEmailSentInTx', () => {
        it('forwards the ids, the time, and the actor on the same tx', async () => {
            const tx: IDatabaseTransactionClient =
                mock<IDatabaseTransactionClient>();
            const sentAt = new Date('2024-01-02T00:00:00.000Z');

            await service.markEmailSentInTx(
                tx,
                ['n-1', 'n-2'],
                sentAt,
                'admin-id'
            );

            expect(
                notificationRepository.markEmailSentInTx
            ).toHaveBeenCalledExactlyOnceWith(
                tx,
                ['n-1', 'n-2'],
                sentAt,
                'admin-id'
            );
        });
    });

    describe('getListCursor', () => {
        it('returns the paginated notification list from the repository', async () => {
            const pagination: IPaginationQueryCursorParams = {
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
            const pagination: IPaginationQueryCursorParams = {
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
                id: 'notification-1',
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
            });
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the row is already read and never writes', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                id: 'notification-1',
                isRead: true,
            });

            await expect(
                service.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationAlreadyReadException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
            });
            expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        });

        it('throws NotificationAlreadyReadException when the guarded write misses after the read', async () => {
            notificationRepository.findIsReadById.mockResolvedValue({
                id: 'notification-1',
                isRead: false,
            });
            notificationRepository.markAsRead.mockResolvedValue(false);

            await expect(
                service.markAsRead('user-id', 'notification-id')
            ).rejects.toMatchObject({
                constructor: NotificationAlreadyReadException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
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
            notificationRepository.markAllAsRead.mockResolvedValue(3);

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

    describe('updateUserSettingInTx', () => {
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
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        });

        const data = {
            channel: EnumNotificationChannel.email,
            type: EnumNotificationType.userActivity,
            isActive: false,
        };

        it('writes the setting', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                true
            );

            await service.updateUserSettingInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(
                notificationUserSettingRepository.updateUserSettingInTx
            ).toHaveBeenCalledWith(tx, 'user-id', data);
        });

        it('adds the userNotificationSettingUpdated entry from the passed context on the same tx after the write', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                true
            );

            await service.updateUserSettingInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.userNotificationSettingUpdated,
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
                service.updateUserSettingInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.settingInvalid,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws NotificationSettingInvalidException when the setting row does not exist', async () => {
            notificationUserSettingRepository.updateUserSettingInTx.mockResolvedValue(
                false
            );

            await expect(
                service.updateUserSettingInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toMatchObject({
                constructor: NotificationSettingInvalidException,
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.settingInvalid,
            });
        });
    });

    describe('createDefaultsManyInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('creates the default settings of every user in one repository statement', async () => {
            await service.createDefaultsManyInTx(
                tx,
                ['user-one', 'user-two'],
                'admin-bramble'
            );

            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationUserSettingRepository.createDefaultsManyInTx
            ).toHaveBeenCalledWith(
                tx,
                ['user-one', 'user-two'],
                'admin-bramble'
            );
        });

        it('issues no statement for an empty list', async () => {
            await service.createDefaultsManyInTx(tx, [], 'admin-bramble');

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
            });
        });
    });

    describe('decryptFailureTokens', () => {
        it('decrypts each failure token with the user id', () => {
            const tokens = buildSealedNotificationPayloads(
                ['token-1', 'token-2'],
                'user-id'
            );

            expect(service.decryptFailureTokens('user-id', tokens)).toEqual([
                'token-1',
                'token-2',
            ]);
        });

        it('rethrows a decryption failure', () => {
            const sealed = buildSealedNotificationPayload('token-1', 'user-9');

            expect(() =>
                service.decryptFailureTokens('user-id', [sealed])
            ).toThrow(
                expect.objectContaining({
                    module: 'helper',
                    statusCode: EnumHelperStatusCodeError.decryptFailed,
                })
            );
        });
    });

    describe('toCensoredMetadata', () => {
        const mobileTitle =
            NotificationKindContract[EnumNotificationKind.verifiedMobileNumber]
                .title;

        it('opens each sealed secret for the recipient and censors it, leaving no sealed key', () => {
            const result = service.toCensoredMetadata(
                mobileTitle,
                {
                    username: 'ana',
                    encryptedMobileNumber: buildSealedNotificationPayload(
                        '+6281234567890',
                        'user-1'
                    ),
                },
                'user-1'
            );

            expect(result).toEqual({
                username: 'ana',
                mobileNumber: '+628********90',
            });
        });

        it('returns the metadata as stored for a title no contract row owns', () => {
            const stored = { username: 'ana' };

            expect(
                service.toCensoredMetadata(
                    'notification.notify.unknown.title',
                    stored,
                    'user-1'
                )
            ).toBe(stored);
        });

        it.each([[null], [['ana']], ['ana']])(
            'returns the metadata as stored when it is no plain object',
            stored => {
                expect(
                    service.toCensoredMetadata(mobileTitle, stored, 'user-1')
                ).toBe(stored);
            }
        );
    });

    describe('toMessageProperties', () => {
        const title = 'notification.notify.welcome.title';

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
            const result = service.toMessageProperties(
                NotificationKindContract[EnumNotificationKind.newDeviceLogin]
                    .title,
                { username: 'ana', loginAt: '2026-03-01T00:05:00.000Z' }
            );

            expect(result).toEqual({
                username: 'ana',
                loginAt: 'Sun, 01 Mar 2026 00:05:00 +0000',
            });
        });

        it('opens nothing: a sealed key stays in the properties as it is stored', () => {
            const result = service.toMessageProperties(
                NotificationKindContract[
                    EnumNotificationKind.verifiedMobileNumber
                ].title,
                { username: 'ana', encryptedMobileNumber: 'sealed-value' }
            );

            expect(result).toEqual({
                username: 'ana',
                encryptedMobileNumber: 'sealed-value',
            });
        });

        it('keeps the properties as they are for a title no contract row owns', () => {
            const result = service.toMessageProperties(
                'notification.notify.unknown.title',
                { username: 'ana' }
            );

            expect(result).toEqual({ username: 'ana' });
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

    describe('censorSecrets', () => {
        it('censors a secret with no dedicated censor through the generic censor and leaves a field outside the secrets', () => {
            expect(
                service['censorSecrets'](EnumNotificationKind.welcomeByAdmin, {
                    password: 'abcdefgh',
                    username: 'ana',
                })
            ).toEqual({ password: '*****fgh', username: 'ana' });
        });

        it('leaves a secret that is no string as it is', () => {
            expect(
                service['censorSecrets'](
                    EnumNotificationKind.verifiedMobileNumber,
                    { mobileNumber: null }
                )
            ).toEqual({ mobileNumber: null });
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
