import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceProcessExpireStaleJoinRequestsUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-join-requests.use-case';
import { MessageService } from '@common/message/services/message.service';

describe('WorkspaceProcessExpireStaleJoinRequestsUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();

    let useCase: WorkspaceProcessExpireStaleJoinRequestsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceProcessExpireStaleJoinRequestsUseCase,
                { provide: MessageService, useValue: messageService },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceProcessExpireStaleJoinRequestsUseCase);
    });

    describe('execute', () => {
        it('expires stale pending join requests and reports the count', async () => {
            workspaceJoinRequestService.expireStalePending.mockResolvedValue(2);

            const result = await useCase.execute();

            expect(result).toEqual({
                message: 'workspace.queue.expireStaleJoinRequests',
                countExpiredJoinRequests: 2,
            });
            expect(
                workspaceJoinRequestService.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });
});
