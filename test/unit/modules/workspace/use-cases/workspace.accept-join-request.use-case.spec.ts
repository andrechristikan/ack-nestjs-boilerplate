import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';
import {
    buildUser,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceAcceptJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: true,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('reviewer-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('reviewer-1')
    );

    let useCase: WorkspaceAcceptJoinRequestUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceAcceptJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceAcceptJoinRequestUseCase);
    });

    describe('execute', () => {
        it('gates, then accepts with the request id, the workspace id and name, and the context, reading no pending request', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.acceptJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('accept');
                }
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'join-request-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual(['gate', 'accept']);
            expect(
                workspaceJoinRequestService.assertJoinRequestAllowed
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.getPendingById
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'join-request-1',
                'workspace-1',
                'Acme'
            );
        });

        it('runs the join-request gate first and stops when it rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('rejects with the accept failure', async () => {
            workspaceJoinRequestService.acceptJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'join-request-1'
                )
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
        });
    });
});
