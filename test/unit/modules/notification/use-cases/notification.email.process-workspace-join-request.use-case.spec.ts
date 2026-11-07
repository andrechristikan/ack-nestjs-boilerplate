import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-request.use-case';

describe('NotificationEmailProcessWorkspaceJoinRequestUseCase', () => {
    const notificationEmailWorkspaceService: MockProxy<NotificationEmailWorkspaceService> =
        mock<NotificationEmailWorkspaceService>();
    let useCase: NotificationEmailProcessWorkspaceJoinRequestUseCase;

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
                NotificationEmailProcessWorkspaceJoinRequestUseCase,
                {
                    provide: NotificationEmailWorkspaceService,
                    useValue: notificationEmailWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessWorkspaceJoinRequestUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                joinRequestId: 'join-request-id',
                encryptedJoinRequestReviewLink: 'cipher-review-link',
            };
            notificationEmailWorkspaceService.processWorkspaceJoinRequest.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailWorkspaceService.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
