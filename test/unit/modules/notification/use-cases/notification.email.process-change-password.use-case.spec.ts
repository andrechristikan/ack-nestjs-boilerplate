import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessChangePasswordUseCase } from '@modules/notification/use-cases/notification.email.process-change-password.use-case';

describe('NotificationEmailProcessChangePasswordUseCase', () => {
    const notificationEmailSecurityService: MockProxy<NotificationEmailSecurityService> =
        mock<NotificationEmailSecurityService>();
    let useCase: NotificationEmailProcessChangePasswordUseCase;

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
                NotificationEmailProcessChangePasswordUseCase,
                {
                    provide: NotificationEmailSecurityService,
                    useValue: notificationEmailSecurityService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessChangePasswordUseCase);
    });

    describe('execute', () => {
        it('forwards send to the security domain', async () => {
            notificationEmailSecurityService.processChangePassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await useCase.execute(job);

            expect(
                notificationEmailSecurityService.processChangePassword
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });
});
