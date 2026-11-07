import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessVerifiedMobileNumberUseCase } from '@modules/notification/use-cases/notification.email.process-verified-mobile-number.use-case';

describe('NotificationEmailProcessVerifiedMobileNumberUseCase', () => {
    const notificationEmailAccountService: MockProxy<NotificationEmailAccountService> =
        mock<NotificationEmailAccountService>();
    let useCase: NotificationEmailProcessVerifiedMobileNumberUseCase;

    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedEmail: 'cipher(nadia@example.com)',
        username: 'nadia',
        cc: [],
        bcc: [],
    };
    const response: INotificationEmailResult = {
        message: 'processed',
        result: { $metadata: {}, MessageId: 'message-id' },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessVerifiedMobileNumberUseCase,
                {
                    provide: NotificationEmailAccountService,
                    useValue: notificationEmailAccountService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessVerifiedMobileNumberUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the account domain', async () => {
            const data = {
                reference: 'ref-1',
                resendInMinutes: 5,
                encryptedMobileNumber: 'cipher(+15551234567)',
            };
            notificationEmailAccountService.processVerifiedMobileNumber.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailAccountService.processVerifiedMobileNumber
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
