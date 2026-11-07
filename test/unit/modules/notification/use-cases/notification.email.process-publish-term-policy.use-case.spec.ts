import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailPublishTermPolicyResult,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';

describe('NotificationEmailProcessPublishTermPolicyUseCase', () => {
    const notificationEmailTermPolicyService: MockProxy<NotificationEmailTermPolicyService> =
        mock<NotificationEmailTermPolicyService>();
    let useCase: NotificationEmailProcessPublishTermPolicyUseCase;
    const publishResponse: INotificationEmailPublishTermPolicyResult = {
        message: 'processed',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessPublishTermPolicyUseCase,
                {
                    provide: NotificationEmailTermPolicyService,
                    useValue: notificationEmailTermPolicyService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessPublishTermPolicyUseCase);
    });

    describe('execute', () => {
        it('forwards data, batchId, proceedBy and recipients to the term-policy domain', async () => {
            const data: INotificationPublishTermPolicyPayload = {
                termPolicyId: 'term-policy-id',
                type: EnumTermPolicyType.privacy,
                version: 2,
                recipientCutoffAt: '2024-01-01T00:00:00.000Z',
                resendNonce: null,
            };
            const recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
                [
                    {
                        userId: 'user-1',
                        notificationId: 'notification-1',
                        encryptedEmail: 'cipher(nadia@example.com)',
                        username: 'nadia',
                    },
                ];
            notificationEmailTermPolicyService.processPublishTermPolicy.mockResolvedValue(
                publishResponse
            );
            const job = buildQueueJob<
                INotificationEmailBulkQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ data, batchId: 'batch-id', proceedBy: 'admin-id', recipients });

            const result = await useCase.execute(job);

            expect(
                notificationEmailTermPolicyService.processPublishTermPolicy
            ).toHaveBeenCalledWith(data, 'batch-id', 'admin-id', recipients);
            expect(result).toBe(publishResponse);
        });
    });
});
