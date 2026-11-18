import { Test } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

describe('NotificationProcessor', () => {
    const notificationProcessorService = mock<NotificationProcessorService>();
    const sentryService = mock<SentryService>();
    let processor: NotificationProcessor;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationProcessor,
                {
                    provide: NotificationProcessorService,
                    useValue: notificationProcessorService,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();
        processor = module.get(NotificationProcessor);
    });

    it('dispatches verificationMobileNumber to processVerificationMobileNumber', async () => {
        const response: IQueueResponse = { message: 'processed' };
        notificationProcessorService.processVerificationMobileNumber.mockResolvedValue(
            response
        );
        const job = {
            name: EnumNotificationProcess.verificationMobileNumber,
            data: { userId: 'user-id', proceedBy: 'user-id', data: {} },
            opts: {},
            log: vi.fn(),
        } as unknown as Job;

        const result = await processor.process(job);

        expect(
            notificationProcessorService.processVerificationMobileNumber
        ).toHaveBeenCalledWith(job);
        expect(result).toBe(response);
    });
});
