import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { MessageService } from '@common/message/services/message.service';

describe('WorkspaceProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceQueue: MockProxy<WorkspaceQueue> = mock<WorkspaceQueue>();

    let service: WorkspaceProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                WorkspaceProcessorService,
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: WorkspaceQueue, useValue: workspaceQueue },
            ],
        }).compile();

        service = module.get(WorkspaceProcessorService);
    });

    describe('onModuleInit', () => {
        it('schedules the invite expiry sweep', async () => {
            await service.onModuleInit();

            expect(
                workspaceQueue.scheduleInviteExpirySweep
            ).toHaveBeenCalledWith();
        });
    });

    describe('processExpireStaleInvites', () => {
        it('expires stale pending invites and reports the count', async () => {
            workspaceInviteDomain.expireStalePending.mockResolvedValue(4);

            const result = await service.processExpireStaleInvites();

            expect(result).toEqual({
                message: 'workspace.queue.expireStaleInvites',
                countExpiredInvites: 4,
            });
            expect(
                workspaceInviteDomain.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'workspace.queue.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'workspace.queue.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});
