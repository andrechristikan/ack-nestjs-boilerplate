import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationPushProcessor', () => {
    const service: MockProxy<NotificationPushProcessorService> =
        mock<NotificationPushProcessorService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
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

    let processor: NotificationPushProcessor;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationPushProcessor,
                {
                    provide: NotificationPushProcessorService,
                    useValue: service,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        processor = module.get(NotificationPushProcessor);
    });

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
