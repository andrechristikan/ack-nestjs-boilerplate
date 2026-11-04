import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceProcessorService } from '@modules/workspace/services/processor/workspace.processor.service';
import { MessageService } from '@common/message/services/message.service';

describe('WorkspaceProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceJoinRequestDomain: MockProxy<WorkspaceJoinRequestDomain> =
        mock<WorkspaceJoinRequestDomain>();
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
                {
                    provide: WorkspaceJoinRequestDomain,
                    useValue: workspaceJoinRequestDomain,
                },
                { provide: WorkspaceQueue, useValue: workspaceQueue },
            ],
        }).compile();

        service = module.get(WorkspaceProcessorService);
    });

    describe('onModuleInit', () => {
        it('schedules the invite and join-request expiry sweeps', async () => {
            await service.onModuleInit();

            expect(
                workspaceQueue.scheduleInviteExpirySweep
            ).toHaveBeenCalledWith();
            expect(
                workspaceQueue.scheduleJoinRequestExpirySweep
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

    describe('processExpireStaleJoinRequests', () => {
        it('expires stale pending join requests and reports the count', async () => {
            workspaceJoinRequestDomain.expireStalePending.mockResolvedValue(2);

            const result = await service.processExpireStaleJoinRequests();

            expect(result).toEqual({
                message: 'workspace.queue.expireStaleJoinRequests',
                countExpiredJoinRequests: 2,
            });
            expect(
                workspaceJoinRequestDomain.expireStalePending
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
