import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';

describe('WorkspaceProcessorService', () => {
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceQueue: MockProxy<WorkspaceQueue> = mock<WorkspaceQueue>();
    let service: WorkspaceProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
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
            workspaceQueue.scheduleInviteExpirySweep.mockResolvedValue(
                undefined
            );

            await service.onModuleInit();

            expect(
                workspaceQueue.scheduleInviteExpirySweep
            ).toHaveBeenCalledWith();
        });
    });

    describe('processExpireStaleInvites', () => {
        it('expires stale pending invites and reports the count', async () => {
            workspaceInviteDomain.expireStalePending.mockResolvedValue(3);

            const result = await service.processExpireStaleInvites();

            expect(result).toEqual({
                message: 'Processed stale workspace invite expiry sweep',
                countExpiredInvites: 3,
            });
            expect(
                workspaceInviteDomain.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });
});
