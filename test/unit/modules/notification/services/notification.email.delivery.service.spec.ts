import { Test } from '@nestjs/testing';
import { BulkEmailStatus } from '@aws-sdk/client-ses';
import type { SendBulkTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildSealedNotificationPayload } from '@test/unit/helpers/test.unit.notification-push.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import {
    EnumNotificationChannel,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import type { INotificationTermPolicyBatchRecipientEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';

describe('NotificationEmailDeliveryService', () => {
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let service: NotificationEmailDeliveryService;

    const stampedAt = new Date('2024-03-01T00:00:00.000Z');

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(stampedAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailDeliveryService,
                NotificationUtil,
                { provide: MessageService, useValue: messageService },
                { provide: AwsSesService, useValue: awsSesService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'email.noReplyAddress': 'noreply@example.com',
                        'email.supportAddress': 'support@example.com',
                        'frontend.name': 'Home',
                        'frontend.baseUrl': 'https://home.example.com',
                    }),
                },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
            ],
        }).compile();
        service = module.get(NotificationEmailDeliveryService);
    });

    describe('stampProcessed', () => {
        it('stamps processedAt on the email delivery row', async () => {
            await service.stampProcessed('notification-id', 'proceed-by-id');

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.email,
                stampedAt,
                'proceed-by-id'
            );
        });
    });

    describe('stampSent', () => {
        it('stamps sentAt on the email delivery row with no failure token', async () => {
            await service.stampSent('notification-id', 'proceed-by-id');

            expect(
                notificationRepository.updateDeliverySentAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.email,
                stampedAt,
                0,
                'proceed-by-id'
            );
        });
    });

    describe('send', () => {
        it('sends the template named by the kind from noreply with the home and support values', async () => {
            const output = { $metadata: {}, MessageId: 'message-1' };
            awsSesService.send.mockResolvedValue(output);

            const result = await service.send(
                EnumNotificationKind.workspaceInvite,
                'invitee@example.com',
                { workspaceName: 'Acme' }
            );

            expect(awsSesService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationKind.workspaceInvite,
                recipients: ['invitee@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    workspaceName: 'Acme',
                },
            });
            expect(result).toBe(output);
        });
    });

    describe('sendPublishTermPolicy', () => {
        const batchId = 'batch-id';
        const data = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 3,
            recipientCutoffAt: '2024-05-01T00:00:00.000Z',
            resendNonce: null,
        };
        const recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
            [
                {
                    userId: 'user-1',
                    notificationId: 'notification-1',
                    encryptedEmail: buildSealedNotificationPayload(
                        'nadia@example.com',
                        'user-1'
                    ),
                    username: 'nadia',
                },
                {
                    userId: 'user-2',
                    notificationId: 'notification-2',
                    encryptedEmail: buildSealedNotificationPayload(
                        'omar@example.com',
                        'user-2'
                    ),
                    username: 'omar',
                },
            ];

        it('sends one bulk email with each email decrypted under its own user id and returns every user as sent', async () => {
            awsSesService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.Success },
                ],
            });

            const outcome = await service.sendPublishTermPolicy(
                data,
                batchId,
                recipients
            );

            expect(awsSesService.sendBulk).toHaveBeenCalledTimes(1);
            expect(awsSesService.sendBulk).toHaveBeenCalledWith({
                templateName: EnumNotificationKind.publishTermPolicy,
                recipients: [
                    {
                        recipient: 'nadia@example.com',
                        templateData: { username: 'nadia' },
                    },
                    {
                        recipient: 'omar@example.com',
                        templateData: { username: 'omar' },
                    },
                ],
                sender: 'noreply@example.com',
                defaultTemplateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    type: data.type,
                    version: '3',
                },
            });
            expect(outcome).toEqual({
                sentUserIds: ['user-1', 'user-2'],
                failedUserIds: [],
                unknownCount: 0,
            });
        });

        it('sorts a success, another status, and a missing status into sent, failed, and unknown', async () => {
            awsSesService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.MessageRejected },
                    {},
                ],
            });

            const outcome = await service.sendPublishTermPolicy(data, batchId, [
                ...recipients,
                {
                    userId: 'user-3',
                    notificationId: 'notification-3',
                    encryptedEmail: buildSealedNotificationPayload(
                        'sara@example.com',
                        'user-3'
                    ),
                    username: 'sara',
                },
            ]);

            expect(outcome).toEqual({
                sentUserIds: ['user-1'],
                failedUserIds: ['user-2'],
                unknownCount: 1,
            });
        });

        it('rethrows a decryption failure without sending', async () => {
            const sealedForAnother = [
                {
                    ...recipients[0]!,
                    encryptedEmail: buildSealedNotificationPayload(
                        'nadia@example.com',
                        'user-9'
                    ),
                },
            ];

            await expect(
                service.sendPublishTermPolicy(data, batchId, sealedForAnother)
            ).rejects.toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
            });
            expect(awsSesService.sendBulk).not.toHaveBeenCalled();
        });

        it('throws the unknown-delivery exception chaining the error when sendBulk throws', async () => {
            const error = new Error('socket hang up');
            awsSesService.sendBulk.mockRejectedValue(error);

            const attempt = service.sendPublishTermPolicy(
                data,
                batchId,
                recipients
            );

            await expect(attempt).rejects.toBeInstanceOf(
                NotificationEmailDeliveryUnknownException
            );
            await expect(attempt).rejects.toMatchObject({
                message: 'notification.queue.email.error.deliveryUnknown',
                batchId,
                unknownCount: 2,
                isFatal: true,
                rawError: error,
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.email.error.deliveryUnknown',
                { properties: { batchId, unknownCount: 2 } }
            );
        });

        it.each([
            ['an empty status list', { $metadata: {}, Status: [] }],
            [
                'no status list',
                { $metadata: {} } as SendBulkTemplatedEmailCommandOutput,
            ],
            [
                'a status list shorter than the recipients',
                {
                    $metadata: {},
                    Status: [{ Status: BulkEmailStatus.Success }],
                },
            ],
        ])(
            'throws the unknown-delivery exception on %s',
            async (_label, output) => {
                awsSesService.sendBulk.mockResolvedValue(output);

                await expect(
                    service.sendPublishTermPolicy(data, batchId, recipients)
                ).rejects.toMatchObject({
                    constructor: NotificationEmailDeliveryUnknownException,
                    message: 'notification.queue.email.error.deliveryUnknown',
                    batchId,
                    unknownCount: 2,
                });
            }
        );
    });

    describe('assertSettled', () => {
        const batchId = 'batch-id';
        const fulfilled: PromiseSettledResult<void> = {
            status: 'fulfilled',
            value: undefined,
        };
        const settled = {
            sentUserIds: ['user-1'],
            failedUserIds: [],
            unknownCount: 0,
        };

        it('returns when nothing failed and nothing is unknown', () => {
            expect(() =>
                service.assertSettled(batchId, 1, settled, fulfilled, fulfilled)
            ).not.toThrow();
        });

        it('throws the unknown-delivery exception with the sent count and the reason for a rejected mark', () => {
            const reason = new Error('db down');

            expect(() =>
                service.assertSettled(
                    batchId,
                    2,
                    {
                        sentUserIds: ['user-1'],
                        failedUserIds: ['user-2'],
                        unknownCount: 0,
                    },
                    { status: 'rejected', reason },
                    fulfilled
                )
            ).toThrowError(
                expect.objectContaining({
                    constructor: NotificationEmailDeliveryUnknownException,
                    message: 'notification.queue.email.error.deliveryUnknown',
                    batchId,
                    unknownCount: 1,
                    rawError: reason,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.email.error.deliveryUnknown',
                { properties: { batchId, unknownCount: 1 } }
            );
        });

        it('throws the unknown-delivery exception with the failed count and the reason for a rejected release', () => {
            const reason = new Error('db down');

            expect(() =>
                service.assertSettled(
                    batchId,
                    3,
                    {
                        sentUserIds: ['user-1'],
                        failedUserIds: ['user-2', 'user-3'],
                        unknownCount: 0,
                    },
                    fulfilled,
                    { status: 'rejected', reason }
                )
            ).toThrowError(
                expect.objectContaining({
                    constructor: NotificationEmailDeliveryUnknownException,
                    batchId,
                    unknownCount: 2,
                    rawError: reason,
                })
            );
        });

        it('throws the mark rejection before the release rejection', () => {
            const markReason = new Error('mark down');

            expect(() =>
                service.assertSettled(
                    batchId,
                    2,
                    {
                        sentUserIds: ['user-1'],
                        failedUserIds: ['user-2'],
                        unknownCount: 0,
                    },
                    { status: 'rejected', reason: markReason },
                    { status: 'rejected', reason: new Error('release down') }
                )
            ).toThrowError(expect.objectContaining({ rawError: markReason }));
        });

        it('throws a fatal QueueException with the failed and claimed counts for a failed recipient', () => {
            const outcome = {
                sentUserIds: ['user-1'],
                failedUserIds: ['user-2'],
                unknownCount: 0,
            };

            expect(() =>
                service.assertSettled(batchId, 2, outcome, fulfilled, fulfilled)
            ).toThrowError(
                expect.objectContaining({
                    constructor: QueueException,
                    isFatal: true,
                    message: 'notification.queue.email.error.batchFailed',
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.email.error.batchFailed',
                {
                    properties: {
                        batchId,
                        failedCount: 1,
                        claimedCount: 2,
                    },
                }
            );
        });

        it('throws the unknown-delivery exception with the unknown count for an unknown status', () => {
            expect(() =>
                service.assertSettled(
                    batchId,
                    2,
                    {
                        sentUserIds: ['user-1'],
                        failedUserIds: [],
                        unknownCount: 1,
                    },
                    fulfilled,
                    fulfilled
                )
            ).toThrowError(
                expect.objectContaining({
                    constructor: NotificationEmailDeliveryUnknownException,
                    batchId,
                    unknownCount: 1,
                })
            );
        });

        it('throws the QueueException when a failed recipient meets an unknown status', () => {
            expect(() =>
                service.assertSettled(
                    batchId,
                    2,
                    {
                        sentUserIds: [],
                        failedUserIds: ['user-1'],
                        unknownCount: 1,
                    },
                    fulfilled,
                    fulfilled
                )
            ).toThrowError(
                expect.objectContaining({
                    constructor: QueueException,
                    message: 'notification.queue.email.error.batchFailed',
                })
            );
        });
    });
});
