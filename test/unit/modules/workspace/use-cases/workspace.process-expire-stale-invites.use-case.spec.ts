import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceProcessExpireStaleInvitesUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case';
import { MessageService } from '@common/message/services/message.service';

describe('WorkspaceProcessExpireStaleInvitesUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();

    let useCase: WorkspaceProcessExpireStaleInvitesUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceProcessExpireStaleInvitesUseCase,
                { provide: MessageService, useValue: messageService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceProcessExpireStaleInvitesUseCase);
    });

    describe('execute', () => {
        it('expires stale pending invites and reports the count', async () => {
            workspaceInviteService.expireStalePending.mockResolvedValue(4);

            const result = await useCase.execute();

            expect(result).toEqual({
                message: 'workspace.queue.expireStaleInvites',
                countExpiredInvites: 4,
            });
            expect(
                workspaceInviteService.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });
});
