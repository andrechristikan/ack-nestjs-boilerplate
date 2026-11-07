import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-rejected.use-case';

describe('NotificationEmailProcessWorkspaceJoinRejectedUseCase', () => {
    const notificationEmailWorkspaceService: MockProxy<NotificationEmailWorkspaceService> =
        mock<NotificationEmailWorkspaceService>();
    let useCase: NotificationEmailProcessWorkspaceJoinRejectedUseCase;

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
                NotificationEmailProcessWorkspaceJoinRejectedUseCase,
                {
                    provide: NotificationEmailWorkspaceService,
                    useValue: notificationEmailWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessWorkspaceJoinRejectedUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };
            notificationEmailWorkspaceService.processWorkspaceJoinRejected.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailWorkspaceService.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
