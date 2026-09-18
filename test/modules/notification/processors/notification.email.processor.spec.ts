import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationEmailProcessor', () => {
    const service = createMock<NotificationEmailProcessorService>();
    const processor = new NotificationEmailProcessor(service);
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

    beforeEach(() => vi.resetAllMocks());

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
