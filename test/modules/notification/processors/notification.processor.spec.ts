import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationProcessor', () => {
    const service = createMock<NotificationProcessorService>();
    const processor = new NotificationProcessor(
        service,
        createMock<SentryService>()
    );
    const cases = [
        [EnumNotificationProcess.newDeviceLogin, service.processNewDeviceLogin],
        [EnumNotificationProcess.welcomeByAdmin, service.processWelcomeByAdmin],
        [
            EnumNotificationProcess.temporaryPasswordByAdmin,
            service.processTemporaryPasswordByAdmin,
        ],
        [
            EnumNotificationProcess.verificationEmail,
            service.processVerificationEmail,
        ],
        [EnumNotificationProcess.forgotPassword, service.processForgotPassword],
        [
            EnumNotificationProcess.verifiedMobileNumber,
            service.processVerifiedMobileNumber,
        ],
        [
            EnumNotificationProcess.publishTermPolicy,
            service.processPublishTermPolicy,
        ],
        [EnumNotificationProcess.welcome, service.processWelcome],
        [EnumNotificationProcess.verifiedEmail, service.processVerifiedEmail],
        [EnumNotificationProcess.resetPassword, service.processResetPassword],
        [
            EnumNotificationProcess.resetTwoFactorByAdmin,
            service.processResetTwoFactorByAdmin,
        ],
        [EnumNotificationProcess.welcomeSocial, service.processWelcomeSocial],
        [EnumNotificationProcess.changePassword, service.processChangePassword],
        [
            EnumNotificationProcess.userAcceptTermPolicy,
            service.processUserAcceptTermPolicy,
        ],
        [
            EnumNotificationProcess.workspaceInvite,
            service.processWorkspaceInvite,
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

    beforeEach(() => vi.resetAllMocks());

    it.each(cases)('dispatches %s jobs', async (name, handler) => {
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationProcess
        >(name, { userId: 'user-id' });
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
            message:
                'No notification processor found for the given job name unknown',
        });
    });

    it('propagates a handler failure', async () => {
        const error = new Error('delivery failed');
        service.processWelcome.mockRejectedValue(error);
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationProcess
        >(EnumNotificationProcess.welcome, {});
        await expect(processor.process(job)).rejects.toBe(error);
    });
});
