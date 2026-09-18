import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationPushProcessor', () => {
    const service = createMock<NotificationPushProcessorService>();
    const processor = new NotificationPushProcessor(service);
    const cases = [
        [
            EnumNotificationPushProcess.newDeviceLogin,
            service.processNewDeviceLogin,
        ],
        [
            EnumNotificationPushProcess.resetTwoFactorByAdmin,
            service.processResetTwoFactorByAdmin,
        ],
        [
            EnumNotificationPushProcess.temporaryPasswordByAdmin,
            service.processTemporaryPasswordByAdmin,
        ],
        [
            EnumNotificationPushProcess.resetPassword,
            service.processResetPassword,
        ],
        [
            EnumNotificationPushProcess.workspaceInvite,
            service.processWorkspaceInvite,
        ],
        [
            EnumNotificationPushProcess.workspaceJoinRequest,
            service.processWorkspaceJoinRequest,
        ],
        [
            EnumNotificationPushProcess.workspaceJoinAccepted,
            service.processWorkspaceJoinAccepted,
        ],
        [
            EnumNotificationPushProcess.workspaceJoinRejected,
            service.processWorkspaceJoinRejected,
        ],
        [
            EnumNotificationPushProcess.cleanupTokens,
            service.processCleanupTokens,
        ],
        [
            EnumNotificationPushProcess.cleanupStaleTokens,
            service.processCleanupStaleTokens,
        ],
    ] as const;

    beforeEach(() => vi.resetAllMocks());

    it.each(cases)('dispatches %s jobs', async (name, handler) => {
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationPushProcess
        >(name, {});
        await processor.process(job);
        if (name === EnumNotificationPushProcess.cleanupStaleTokens) {
            expect(handler).toHaveBeenCalledWith();
        } else {
            expect(handler).toHaveBeenCalledWith(job);
        }
    });

    it('returns a diagnostic response for an unknown job', async () => {
        const job = createQueueJob<
            unknown,
            IQueueResponse,
            EnumNotificationPushProcess
        >(EnumNotificationPushProcess.cleanupTokens, {});
        Object.defineProperty(job, 'name', { value: 'unknown' });
        await expect(processor.process(job)).resolves.toEqual({
            message:
                'No notification processor found for the given job name unknown',
        });
    });
});
