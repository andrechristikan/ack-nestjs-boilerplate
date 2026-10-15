import { Test } from '@nestjs/testing';
import type { SendBulkTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationTermPolicyBatchRecipientEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { QueueException } from '@queues/exceptions/queue.exception';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationEmailTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let domain: NotificationEmailTermPolicyDomain;

    const now = new Date('2024-05-01T00:00:00.000Z');
    const batchId = 'batch-id';
    const proceedBy = 'admin-id';
    const recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
        [
            {
                userId: 'user-1',
                notificationId: 'notification-1',
                encryptedEmail: 'cipher(nadia@example.com)',
                username: 'nadia',
            },
            {
                userId: 'user-2',
                notificationId: 'notification-2',
                encryptedEmail: 'cipher(omar@example.com)',
                username: 'omar',
            },
        ];
    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 3,
        recipientCutoffAt: '2024-05-01T00:00:00.000Z',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'email.noreply': 'noreply@example.com',
                'email.support': 'support@example.com',
                'home.name': 'Home',
                'home.url': 'https://home.example.com',
                'app.encryptionSecretKey': 'secret-key',
            };

            return values[key];
        });
        helperDateService.create.mockReturnValue(now);
        stubCipherDecryption(helperEncryptionService);
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailTermPolicyDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        domain = module.get(NotificationEmailTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        it('sends one bulk email from the payload recipients alone, reading no user, and marks both sent', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }, { Status: 'Success' }],
            });

            const result = await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(
                notificationRepository.findTermPolicyRecipientsUnsent
            ).toHaveBeenCalledWith(data.termPolicyId, batchId);
            expect(awsSESService.sendBulk).toHaveBeenCalledTimes(1);
            expect(awsSESService.sendBulk).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.publishTermPolicy,
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
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-1', 'user-2'],
                now,
                proceedBy
            );
            expect(result).toMatchObject({
                message: 'Publish term policy email processed',
            });
        });

        it('decrypts each payload email with its own user id before the SES call', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            const order: string[] = [];
            helperEncryptionService.aes256Decrypt.mockImplementation(
                (encrypted: string) => {
                    order.push('decrypt');

                    return encrypted.replace(/^cipher\((.*)\)$/, '$1');
                }
            );
            awsSESService.sendBulk.mockImplementation(async () => {
                order.push('send');

                return {
                    $metadata: {},
                    Status: [{ Status: 'Success' }, { Status: 'Success' }],
                };
            });

            await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(nadia@example.com)',
                'secret-key',
                'notification.payload',
                'user-1'
            );
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(omar@example.com)',
                'secret-key',
                'notification.payload',
                'user-2'
            );
            expect(order).toEqual(['decrypt', 'decrypt', 'send']);
        });

        it('skips a payload recipient whose marker is already sent', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }],
            });

            await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(awsSESService.sendBulk).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipients: [
                        {
                            recipient: 'omar@example.com',
                            templateData: { username: 'omar' },
                        },
                    ],
                })
            );
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-2'],
                now,
                proceedBy
            );
        });

        it('ignores an unsent marker the payload does not carry', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-3']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }],
            });

            await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-1'],
                now,
                proceedBy
            );
        });

        it('rethrows a decryption failure without calling SES or marking', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            const error = new HelperDecryptFailedException();
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw error;
            });

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toBe(error);
            expect(awsSESService.sendBulk).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('sends and marks nothing when no recipient is unsent', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                []
            );

            const result = await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(awsSESService.sendBulk).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
            expect(result).toMatchObject({
                message: 'Publish term policy email processed',
            });
        });

        it('rethrows when SES rejects and marks nothing', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            const error = new Error('ses down');
            awsSESService.sendBulk.mockRejectedValue(error);

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toBe(error);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('marks only the delivered recipient and throws a fatal-flagged QueueException on a partial SES result', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }, { Status: 'TransientFailure' }],
            });

            const run = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            await expect(run).rejects.toBeInstanceOf(QueueException);
            await expect(run).rejects.toMatchObject({
                isFatal: true,
                message: expect.stringContaining(batchId),
            });
            await expect(run).rejects.toThrow(/1 of 2/);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-1'],
                now,
                proceedBy
            );
        });

        it('marks nothing and throws a fatal-flagged QueueException when every recipient fails', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: 'TransientFailure' },
                    { Status: 'TransientFailure' },
                ],
            });

            const run = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            await expect(run).rejects.toBeInstanceOf(QueueException);
            await expect(run).rejects.toMatchObject({
                isFatal: true,
                message: expect.stringContaining(batchId),
            });
            await expect(run).rejects.toThrow(/2 of 2/);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('throws a QueueException when the SES status list is shorter than the recipients', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }],
            });

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toBeInstanceOf(QueueException);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-1'],
                now,
                proceedBy
            );
        });

        it('completes without marking when SES is not configured and returns an empty status list', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [],
            });

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).resolves.toMatchObject({
                message: 'Publish term policy email processed',
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('completes without marking when SES returns no status', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                ['user-1', 'user-2']
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
            } as SendBulkTemplatedEmailCommandOutput);

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).resolves.toMatchObject({
                message: 'Publish term policy email processed',
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });
    });
});
