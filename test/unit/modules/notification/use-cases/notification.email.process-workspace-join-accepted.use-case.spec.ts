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
import { NotificationEmailProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-accepted.use-case';

describe('NotificationEmailProcessWorkspaceJoinAcceptedUseCase', () => {
    const notificationEmailWorkspaceService: MockProxy<NotificationEmailWorkspaceService> =
        mock<NotificationEmailWorkspaceService>();
    let useCase: NotificationEmailProcessWorkspaceJoinAcceptedUseCase;

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
                NotificationEmailProcessWorkspaceJoinAcceptedUseCase,
                {
                    provide: NotificationEmailWorkspaceService,
                    useValue: notificationEmailWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessWorkspaceJoinAcceptedUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
            notificationEmailWorkspaceService.processWorkspaceJoinAccepted.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailWorkspaceService.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
