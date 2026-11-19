import { UserUtil } from '@modules/user/utils/user.util';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceJoinRequestStatus } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceCreateJoinRequestUseCase', () => {
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
    const joinable = { workspace, reviewerIds: ['reviewer-1'] };
    const joinRequest: WorkspaceJoinRequest = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-2',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-2',
        workspaceId: 'workspace-1',
        userId: 'user-2',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        expiredAt: new Date('2026-01-09T00:00:00.000Z'),
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-2', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    let useCase: WorkspaceCreateJoinRequestUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: UserUtil, useValue: userUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateJoinRequestUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceJoinRequestCreateRequestDto = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };

        beforeEach(() => {
            workspaceJoinRequestService.getJoinableWorkspace.mockResolvedValue(
                joinable
            );
            workspaceJoinRequestService.createJoinRequest.mockResolvedValue(
                joinRequest
            );
            userUtil.getDisplayName.mockReturnValue('Jane Doe');
        });

        it('gates on the flag, reads the joinable workspace, creates the request with the notice and the context', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.getJoinableWorkspace.mockImplementation(
                async () => {
                    callOrder.push('joinable');

                    return joinable;
                }
            );
            workspaceJoinRequestService.createJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return joinRequest;
                }
            );
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({ data: joinRequest });
            expect(callOrder.slice(0, 2)).toEqual(['gate', 'joinable']);
            expect(callOrder.at(-1)).toBe('create');
            expect(
                workspaceJoinRequestService.assertJoinRequestAllowed
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
            expect(userUtil.getDisplayName).toHaveBeenCalledWith(
                userContext.user
            );
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                {
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    reviewerIds: ['reviewer-1'],
                }
            );
        });

        it('passes null for an omitted message', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { workspaceId: 'workspace-1' }
            );

            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: null },
                expect.objectContaining({ reviewerIds: ['reviewer-1'] })
            );
        });

        it('passes an empty reviewer list when the workspace has no reviewer', async () => {
            workspaceJoinRequestService.getJoinableWorkspace.mockResolvedValue({
                workspace,
                reviewerIds: [],
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({ data: joinRequest });
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                expect.objectContaining({ reviewerIds: [] })
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
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).not.toHaveBeenCalled();
        });

        it('reads no target when the workspace is not joinable', async () => {
            workspaceJoinRequestService.getJoinableWorkspace.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('rejects with the create failure', async () => {
            workspaceJoinRequestService.createJoinRequest.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
        });
    });
});
