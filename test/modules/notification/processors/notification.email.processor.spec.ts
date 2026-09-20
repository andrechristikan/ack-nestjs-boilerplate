import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationEmailProcessor', () => {
    const service: MockProxy<NotificationEmailProcessorService> =
        mock<NotificationEmailProcessorService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const cases = [
        [EnumNotificationProcess.changePassword, service.processChangePassword],
        [EnumNotificationProcess.welcome, service.processWelcome],
        [EnumNotificationProcess.welcomeSocial, service.processWelcomeSocial],
        [EnumNotificationProcess.welcomeByAdmin, service.processWelcomeByAdmin],
        [
            EnumNotificationProcess.temporaryPasswordByAdmin,
            service.processTemporaryPasswordByAdmin,
        ],
        [EnumNotificationProcess.forgotPassword, service.processForgotPassword],
        [
            EnumNotificationProcess.verificationEmail,
            service.processVerificationEmail,
        ],
        [EnumNotificationProcess.verifiedEmail, service.processVerifiedEmail],
        [
            EnumNotificationProcess.verifiedMobileNumber,
            service.processVerifiedMobileNumber,
        ],
        [EnumNotificationProcess.newDeviceLogin, service.processNewDeviceLogin],
        [EnumNotificationProcess.resetPassword, service.processResetPassword],
        [
            EnumNotificationProcess.resetTwoFactorByAdmin,
            service.processResetTwoFactorByAdmin,
        ],
        [
            EnumNotificationProcess.publishTermPolicy,
            service.processPublishTermPolicy,
        ],
        [
            EnumNotificationProcess.workspaceInvite,
            service.processWorkspaceInvite,
        ],
        [
            EnumNotificationProcess.workspaceInviteUnregistered,
            service.processWorkspaceInviteUnregistered,
        ],
        [
            EnumNotificationProcess.workspaceJoinRequest,
            service.processWorkspaceJoinRequest,
        ],
        [
            EnumNotificationProcess.workspaceJoinAccepted,
            service.processWorkspaceJoinAccepted,
        ],
        [
            EnumNotificationProcess.workspaceJoinRejected,
            service.processWorkspaceJoinRejected,
        ],
    ] as const;

    let processor: NotificationEmailProcessor;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessor,
                {
                    provide: NotificationEmailProcessorService,
                    useValue: service,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        processor = module.get(NotificationEmailProcessor);
    });

    it.each(cases)('dispatches %s jobs', async (name, handler) => {
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationProcess
        >(name, {});
        await processor.process(job);
        expect(handler).toHaveBeenCalledWith(job);
    });

    it('returns a diagnostic response for an unknown job', async () => {
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationProcess
        >(EnumNotificationProcess.welcome, {});
        Object.defineProperty(job, 'name', { value: 'unknown' });
        await expect(processor.process(job)).resolves.toEqual({
            message: 'No email processor found for the given job name',
        });
    });
});
