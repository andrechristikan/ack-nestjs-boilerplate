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
import { NotificationEmailProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.email.process-verified-email.use-case';

describe('NotificationEmailProcessVerifiedEmailUseCase', () => {
    const notificationEmailAccountService: MockProxy<NotificationEmailAccountService> =
        mock<NotificationEmailAccountService>();
    let useCase: NotificationEmailProcessVerifiedEmailUseCase;

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
                NotificationEmailProcessVerifiedEmailUseCase,
                {
                    provide: NotificationEmailAccountService,
                    useValue: notificationEmailAccountService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessVerifiedEmailUseCase);
    });

    describe('execute', () => {
        it('forwards send and data to the account domain', async () => {
            const data = { reference: 'ref-1' };
            notificationEmailAccountService.processVerifiedEmail.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailAccountService.processVerifiedEmail
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
