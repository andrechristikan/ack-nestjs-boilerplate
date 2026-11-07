import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailResult,
    INotificationEmailUnregisteredQueuePayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessWorkspaceInviteUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite-unregistered.use-case';

describe('NotificationEmailProcessWorkspaceInviteUnregisteredUseCase', () => {
    const notificationEmailWorkspaceService: MockProxy<NotificationEmailWorkspaceService> =
        mock<NotificationEmailWorkspaceService>();
    let useCase: NotificationEmailProcessWorkspaceInviteUnregisteredUseCase;

    const response: INotificationEmailResult = {
        message: 'processed',
        result: { $metadata: {}, MessageId: 'message-id' },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessWorkspaceInviteUnregisteredUseCase,
                {
                    provide: NotificationEmailWorkspaceService,
                    useValue: notificationEmailWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationEmailProcessWorkspaceInviteUnregisteredUseCase
        );
    });

    describe('execute', () => {
        it('forwards send and data to the workspace domain', async () => {
            const unregisteredSend = {
                encryptedEmail: 'cipher-email',
                cc: [],
                bcc: [],
            };
            const data: INotificationWorkspaceInviteUnregisteredEncryptedPayload =
                {
                    workspaceId: 'workspace-id',
                    workspaceName: 'Acme',
                    inviterName: 'Omar',
                    workspaceMemberRole: EnumWorkspaceMemberRole.member,
                    encryptedInviteAcceptLink: 'cipher-link',
                    reference: 'ref-1',
                    expiredAt: '2024-02-01T00:00:00.000Z',
                };
            notificationEmailWorkspaceService.processWorkspaceInviteUnregistered.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailUnregisteredQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send: unregisteredSend, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailWorkspaceService.processWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith(unregisteredSend, data);
            expect(result).toBe(response);
        });
    });
});
