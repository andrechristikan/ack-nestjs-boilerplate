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
import { NotificationEmailProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-temporary-password-by-admin.use-case';

describe('NotificationEmailProcessTemporaryPasswordByAdminUseCase', () => {
    const notificationEmailSecurityService: MockProxy<NotificationEmailSecurityService> =
        mock<NotificationEmailSecurityService>();
    let useCase: NotificationEmailProcessTemporaryPasswordByAdminUseCase;

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
                NotificationEmailProcessTemporaryPasswordByAdminUseCase,
                {
                    provide: NotificationEmailSecurityService,
                    useValue: notificationEmailSecurityService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessTemporaryPasswordByAdminUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the security domain', async () => {
            const data = {
                encryptedPassword: 'cipher',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationEmailSecurityService.processTemporaryPasswordByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailSecurityService.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
