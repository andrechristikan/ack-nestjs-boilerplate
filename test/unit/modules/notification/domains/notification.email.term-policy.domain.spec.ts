import { Test } from '@nestjs/testing';
import { BulkEmailStatus } from '@aws-sdk/client-ses';
import type { SendBulkTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
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
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let domain: NotificationEmailTermPolicyDomain;

    const now = new Date('2024-05-01T00:00:00.000Z');
    const batchId = 'batch-id';
    const proceedBy = 'admin-id';
    const claimNonce = 'claim-id';
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
        resendNonce: null,
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
        databaseUtil.createId.mockReturnValue(claimNonce);
        awsSESService.isInitialized.mockReturnValue(true);
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
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        domain = module.get(NotificationEmailTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        const processed = { message: 'Publish term policy email processed' };

        it('sends one bulk email from the payload recipients alone, reading no user, and marks both sent', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.Success },
                ],
            });

            const result = await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

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
            expect(result).toMatchObject(processed);
        });

        it('decrypts each payload email with its own user id before the SES call', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
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
                    Status: [
                        { Status: BulkEmailStatus.Success },
                        { Status: BulkEmailStatus.Success },
                    ],
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

        it('resolves without claiming, decrypting, or sending when SES is uninitialized', async () => {
            awsSESService.isInitialized.mockReturnValue(false);

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).resolves.toMatchObject(processed);
            expect(
                notificationRepository.claimTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(awsSESService.sendBulk).not.toHaveBeenCalled();
            expect(
                helperEncryptionService.aes256Decrypt
            ).not.toHaveBeenCalled();
        });

        it('rethrows a decryption failure without claiming', async () => {
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
            expect(
                notificationRepository.claimTermPolicyRecipients
            ).not.toHaveBeenCalled();
        });

        it('sends nothing when the claim returns no recipient', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue(
                []
            );

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).resolves.toMatchObject(processed);
            expect(awsSESService.sendBulk).not.toHaveBeenCalled();
        });

        it('claims every payload recipient under one claim id and the current time', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue(
                []
            );

            await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            expect(
                notificationRepository.claimTermPolicyRecipients
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                batchId,
                ['user-1', 'user-2'],
                claimNonce,
                now,
                proceedBy
            );
        });

        it('sends and marks only the recipients this attempt read back as claimed', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: BulkEmailStatus.Success }],
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
            ).toHaveBeenCalledWith(claimNonce, ['user-2'], now, proceedBy);
        });

        it('matches statuses to the claim order when it differs from the payload order', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-2',
                'user-1',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.MessageRejected },
                ],
            });

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toBeInstanceOf(QueueException);
            expect(awsSESService.sendBulk).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipients: [
                        {
                            recipient: 'omar@example.com',
                            templateData: { username: 'omar' },
                        },
                        {
                            recipient: 'nadia@example.com',
                            templateData: { username: 'nadia' },
                        },
                    ],
                })
            );
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(claimNonce, ['user-2'], now, proceedBy);
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).toHaveBeenCalledWith(claimNonce, ['user-1'], proceedBy);
        });

        it('marks both sent and releases none when every recipient succeeds', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.Success },
                ],
            });

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).resolves.toMatchObject(processed);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(
                claimNonce,
                ['user-1', 'user-2'],
                now,
                proceedBy
            );
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).not.toHaveBeenCalled();
        });

        it('marks the delivered recipient, releases the rejected one, and throws a fatal QueueException on a definite failure', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.MessageRejected },
                ],
            });

            const attempt = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            await expect(attempt).rejects.toBeInstanceOf(QueueException);
            await expect(attempt).rejects.toMatchObject({
                isFatal: true,
                message: expect.stringContaining(batchId),
            });
            await expect(attempt).rejects.toThrow(/1 of 2/);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(claimNonce, ['user-1'], now, proceedBy);
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).toHaveBeenCalledWith(claimNonce, ['user-2'], proceedBy);
        });

        it('marks and releases nothing and throws the unknown-delivery exception when sendBulk throws', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            const error = new Error('socket hang up');
            awsSESService.sendBulk.mockRejectedValue(error);

            const attempt = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            await expect(attempt).rejects.toBeInstanceOf(
                NotificationEmailDeliveryUnknownException
            );
            await expect(attempt).rejects.toMatchObject({
                message: expect.stringMatching(/batch-id.* 2 recipients/),
                rawError: error,
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['an empty status list', { $metadata: {}, Status: [] }],
            [
                'no status list',
                { $metadata: {} } as SendBulkTemplatedEmailCommandOutput,
            ],
            [
                'a status list shorter than the claim',
                {
                    $metadata: {},
                    Status: [{ Status: BulkEmailStatus.Success }],
                },
            ],
        ])(
            'marks and releases nothing and throws the unknown-delivery exception on %s',
            async (_label, output) => {
                notificationRepository.claimTermPolicyRecipients.mockResolvedValue(
                    ['user-1', 'user-2']
                );
                awsSESService.sendBulk.mockResolvedValue(output);

                const attempt = domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                );

                await expect(attempt).rejects.toBeInstanceOf(
                    NotificationEmailDeliveryUnknownException
                );
                await expect(attempt).rejects.toMatchObject({
                    message: expect.stringContaining(' 2 recipients'),
                });
                expect(
                    notificationRepository.markTermPolicyRecipientsSent
                ).not.toHaveBeenCalled();
                expect(
                    notificationRepository.releaseTermPolicyRecipients
                ).not.toHaveBeenCalled();
            }
        );

        it('marks the delivered recipient and throws the unknown-delivery exception for an entry with no status', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: BulkEmailStatus.Success }, {}],
            });

            const attempt = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy,
                recipients
            );

            await expect(attempt).rejects.toBeInstanceOf(
                NotificationEmailDeliveryUnknownException
            );
            await expect(attempt).rejects.toMatchObject({
                message: expect.stringContaining(' 1 recipients'),
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(claimNonce, ['user-1'], now, proceedBy);
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).not.toHaveBeenCalled();
        });

        it('releases the rejected recipient and throws a QueueException when a failure meets an unknown entry', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: BulkEmailStatus.MessageRejected }, {}],
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
                notificationRepository.releaseTermPolicyRecipients
            ).toHaveBeenCalledWith(claimNonce, ['user-1'], proceedBy);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('releases the rejected recipient and wraps the mark error in AppUnknownException when the mark fails', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.MessageRejected },
                ],
            });
            const error = new Error('db down');
            notificationRepository.markTermPolicyRecipientsSent.mockRejectedValue(
                error
            );

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
            expect(
                notificationRepository.releaseTermPolicyRecipients
            ).toHaveBeenCalledWith(claimNonce, ['user-2'], proceedBy);
        });

        it('marks the delivered recipient and wraps the release error in AppUnknownException when the release fails', async () => {
            notificationRepository.claimTermPolicyRecipients.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [
                    { Status: BulkEmailStatus.Success },
                    { Status: BulkEmailStatus.MessageRejected },
                ],
            });
            const error = new Error('db down');
            notificationRepository.releaseTermPolicyRecipients.mockRejectedValue(
                error
            );

            await expect(
                domain.processPublishTermPolicy(
                    data,
                    batchId,
                    proceedBy,
                    recipients
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).toHaveBeenCalledWith(claimNonce, ['user-1'], now, proceedBy);
        });
    });
});
