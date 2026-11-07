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
import { NotificationEmailProcessWelcomeSocialUseCase } from '@modules/notification/use-cases/notification.email.process-welcome-social.use-case';

describe('NotificationEmailProcessWelcomeSocialUseCase', () => {
    const notificationEmailAccountService: MockProxy<NotificationEmailAccountService> =
        mock<NotificationEmailAccountService>();
    let useCase: NotificationEmailProcessWelcomeSocialUseCase;

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
                NotificationEmailProcessWelcomeSocialUseCase,
                {
                    provide: NotificationEmailAccountService,
                    useValue: notificationEmailAccountService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessWelcomeSocialUseCase);
    });

    describe('execute', () => {
        it('forwards send to the account domain', async () => {
            notificationEmailAccountService.processWelcomeSocial.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await useCase.execute(job);

            expect(
                notificationEmailAccountService.processWelcomeSocial
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });
});
