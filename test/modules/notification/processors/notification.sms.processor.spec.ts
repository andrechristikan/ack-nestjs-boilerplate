import { Test } from '@nestjs/testing';
import type { Scope } from '@sentry/nestjs';
import { Job } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationSmsProcessor } from '@modules/notification/processors/notification.sms.processor';
import { NotificationSmsProcessorService } from '@modules/notification/services/notification.sms.processor.service';
import { EnumNotificationSmsProcess } from '@modules/notification/enums/notification.enum';

describe('NotificationSmsProcessor delivery errors', () => {
    const service = mock<NotificationSmsProcessorService>();
    const sentryService = mock<SentryService>();
    const job = mock<Job<unknown, null, EnumNotificationSmsProcess>>();
    let processor: NotificationSmsProcessor;
    beforeEach(async () => {
        vi.resetAllMocks();
        job.name = EnumNotificationSmsProcess.newDeviceLogin;
        job.opts = { attempts: 3 };
        job.attemptsMade = 1;
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsProcessor,
                {
                    provide: NotificationSmsProcessorService,
                    useValue: service,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();
        processor = module.get(NotificationSmsProcessor);
    });
    it('rethrows a delivery failure as is so BullMQ retries it', async () => {
        const failure = new Error('provider');
        service.processSecurityAlert.mockRejectedValue(failure);
        await expect(processor.process(job)).rejects.toBe(failure);
    });
    it('does not report to Sentry while attempts remain', async () => {
        const failure = new Error('provider');
        service.processSecurityAlert.mockRejectedValue(failure);
        const error: unknown = await processor
            .process(job)
            .catch((caught: unknown) => caught);
        if (!(error instanceof Error)) {
            throw error;
        }
        processor.onFailed(job, error);
        expect(sentryService.captureException).not.toHaveBeenCalled();
    });
    it('reports the final failure once and logs the provider error', async () => {
        const scope = mock<Scope>();
        sentryService.withScope.mockImplementation(callback => callback(scope));
        const logs: string[] = [];
        job.log.mockImplementation(async message => {
            logs.push(message);
            return 1;
        });
        job.attemptsMade = 3;
        const failure = new Error('provider failure');
        service.processSecurityAlert.mockRejectedValue(failure);
        const error: unknown = await processor
            .process(job)
            .catch((caught: unknown) => caught);
        if (!(error instanceof Error)) {
            throw error;
        }
        processor.onFailed(job, error);
        expect(sentryService.captureException).toHaveBeenCalledExactlyOnceWith(
            failure
        );
        expect(logs).toContain('Job failed provider failure');
    });
});
