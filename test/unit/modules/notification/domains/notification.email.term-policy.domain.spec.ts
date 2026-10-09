import { Test } from '@nestjs/testing';
import type { SendBulkTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationTermPolicyRecipientSend } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { QueueException } from '@queues/exceptions/queue.exception';

describe('NotificationEmailTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let domain: NotificationEmailTermPolicyDomain;

    const now = new Date('2024-05-01T00:00:00.000Z');
    const batchId = 'batch-id';
    const proceedBy = 'admin-id';
    const recipients: INotificationTermPolicyRecipientSend[] = [
        {
            userId: 'user-1',
            notificationId: 'notification-1',
            email: 'nadia@example.com',
            username: 'nadia',
        },
        {
            userId: 'user-2',
            notificationId: 'notification-2',
            email: 'omar@example.com',
            username: 'omar',
        },
    ];
    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 3,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'email.noreply': 'noreply@example.com',
                'email.support': 'support@example.com',
                'home.name': 'Home',
                'home.url': 'https://home.example.com',
            };

            return values[key];
        });
        helperDateService.create.mockReturnValue(now);
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
            ],
        }).compile();
        domain = module.get(NotificationEmailTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        it('sends one bulk email for the unsent recipients and marks both sent', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                recipients
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }, { Status: 'Success' }],
            });

            const result = await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy
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

        it('sends and marks nothing when no recipient is unsent', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                []
            );

            const result = await domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy
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
                recipients
            );
            const error = new Error('ses down');
            awsSESService.sendBulk.mockRejectedValue(error);

            await expect(
                domain.processPublishTermPolicy(data, batchId, proceedBy)
            ).rejects.toBe(error);
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('marks only the delivered recipient and throws a fatal-flagged QueueException on a partial SES result', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                recipients
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }, { Status: 'TransientFailure' }],
            });

            const run = domain.processPublishTermPolicy(
                data,
                batchId,
                proceedBy
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
                recipients
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
                proceedBy
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
                recipients
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [{ Status: 'Success' }],
            });

            await expect(
                domain.processPublishTermPolicy(data, batchId, proceedBy)
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
                recipients
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [],
            });

            await expect(
                domain.processPublishTermPolicy(data, batchId, proceedBy)
            ).resolves.toMatchObject({
                message: 'Publish term policy email processed',
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });

        it('completes without marking when SES returns no status', async () => {
            notificationRepository.findTermPolicyRecipientsUnsent.mockResolvedValue(
                recipients
            );
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
            } as SendBulkTemplatedEmailCommandOutput);

            await expect(
                domain.processPublishTermPolicy(data, batchId, proceedBy)
            ).resolves.toMatchObject({
                message: 'Publish term policy email processed',
            });
            expect(
                notificationRepository.markTermPolicyRecipientsSent
            ).not.toHaveBeenCalled();
        });
    });
});
