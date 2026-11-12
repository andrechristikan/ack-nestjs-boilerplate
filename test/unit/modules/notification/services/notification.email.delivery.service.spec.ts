import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';

describe('NotificationEmailDeliveryService', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    let service: NotificationEmailDeliveryService;

    const stampedAt = new Date('2024-03-01T00:00:00.000Z');

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
        helperDateService.create.mockReturnValue(stampedAt);
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailDeliveryService,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
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
            await service.stampProcessed('notification-id');

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.email,
                stampedAt
            );
        });
    });

    describe('stampSent', () => {
        it('stamps sentAt on the email delivery row with no failure token', async () => {
            await service.stampSent('notification-id');

            expect(
                notificationRepository.updateDeliverySentAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.email,
                stampedAt,
                []
            );
        });
    });

    describe('send', () => {
        it('sends the template named by the kind from noreply with the home and support values', async () => {
            const output = { $metadata: {}, MessageId: 'message-1' };
            awsSESService.send.mockResolvedValue(output);

            const result = await service.send(
                EnumNotificationKind.workspaceInvite,
                'invitee@example.com',
                { workspaceName: 'Acme' }
            );

            expect(awsSESService.send).toHaveBeenCalledWith({
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
});
