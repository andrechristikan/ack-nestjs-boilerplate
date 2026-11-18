import { Test } from '@nestjs/testing';
import type { Scope } from '@sentry/nestjs';
import { Job, UnrecoverableError } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
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

    describe('dispatch', () => {
        it('routes verificationMobileNumber to processVerificationMobileNumber', async () => {
            job.name = EnumNotificationSmsProcess.verificationMobileNumber;
            service.processVerificationMobileNumber.mockResolvedValue({
                message: 'ok',
            });

            const result = await processor.process(job);

            expect(
                service.processVerificationMobileNumber
            ).toHaveBeenCalledWith(job);
            expect(service.processSecurityAlert).not.toHaveBeenCalled();
            expect(result).toEqual({ message: 'ok' });
        });

        it('rejects a verificationMobileNumber decrypt failure as UnrecoverableError', async () => {
            job.name = EnumNotificationSmsProcess.verificationMobileNumber;
            const failure = new HelperDecryptFailedException();
            service.processVerificationMobileNumber.mockRejectedValue(failure);

            const call = processor.process(job);

            await expect(call).rejects.toBeInstanceOf(UnrecoverableError);
            await expect(call).rejects.toMatchObject({
                message: failure.message,
            });
        });

        it('rethrows any other verificationMobileNumber error unchanged', async () => {
            job.name = EnumNotificationSmsProcess.verificationMobileNumber;
            const failure = new Error('provider');
            service.processVerificationMobileNumber.mockRejectedValue(failure);

            await expect(processor.process(job)).rejects.toBe(failure);
        });

        it.each([
            EnumNotificationSmsProcess.newDeviceLogin,
            EnumNotificationSmsProcess.resetTwoFactorByAdmin,
        ])('still routes %s to processSecurityAlert', async name => {
            job.name = name;
            service.processSecurityAlert.mockResolvedValue({ message: 'ok' });

            await processor.process(job);

            expect(service.processSecurityAlert).toHaveBeenCalledWith(job);
            expect(
                service.processVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });
    });
});
