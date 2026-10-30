import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MembershipWorkspaceDomain } from '@modules/membership/domains/membership.workspace.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';

describe('MembershipWorkspaceDomain', () => {
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceJoinRequestDomain: MockProxy<WorkspaceJoinRequestDomain> =
        mock<WorkspaceJoinRequestDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deletedAt = new Date('2026-01-01T00:00:00.000Z');

    let domain: MembershipWorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MembershipWorkspaceDomain,
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                {
                    provide: WorkspaceJoinRequestDomain,
                    useValue: workspaceJoinRequestDomain,
                },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(MembershipWorkspaceDomain);
    });

    describe('softDelete', () => {
        it('soft-deletes the workspace, its projects, its pending invites, and its pending join requests in order on one transaction', async () => {
            const calls: string[] = [];
            workspaceDomain.softDeleteInTx.mockImplementation(async () => {
                calls.push('workspace');
            });
            projectDomain.softDeleteByWorkspaceInTx.mockImplementation(
                async () => {
                    calls.push('projects');
                }
            );
            workspaceInviteDomain.expirePendingByWorkspaceInTx.mockImplementation(
                async () => {
                    calls.push('invites');
                }
            );
            workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx.mockImplementation(
                async () => {
                    calls.push('joinRequests');
                }
            );

            await domain.softDelete('workspace-1', 'user-1');

            expect(calls).toEqual([
                'workspace',
                'projects',
                'invites',
                'joinRequests',
            ]);
            expect(workspaceDomain.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt
            );
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', deletedAt, 'user-1');
            expect(
                workspaceInviteDomain.expirePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
            expect(
                workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });

        it('propagates a failure and runs no later step', async () => {
            workspaceDomain.softDeleteInTx.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                domain.softDelete('workspace-1', 'user-1')
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteDomain.expirePendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
        });
    });
});
