import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
    INotificationWorkspaceInviteEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite.use-case';

describe('NotificationEmailProcessWorkspaceInviteUseCase', () => {
    const notificationEmailWorkspaceService: MockProxy<NotificationEmailWorkspaceService> =
        mock<NotificationEmailWorkspaceService>();
    let useCase: NotificationEmailProcessWorkspaceInviteUseCase;

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
                NotificationEmailProcessWorkspaceInviteUseCase,
                {
                    provide: NotificationEmailWorkspaceService,
                    useValue: notificationEmailWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessWorkspaceInviteUseCase);
    });

    describe('execute', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data: INotificationWorkspaceInviteEncryptedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                encryptedInviteAcceptLink: 'cipher-link',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            notificationEmailWorkspaceService.processWorkspaceInvite.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailWorkspaceService.processWorkspaceInvite
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
