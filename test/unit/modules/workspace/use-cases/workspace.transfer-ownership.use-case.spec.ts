import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceTransferOwnershipUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership.use-case';
import {
    buildUser,
    buildWorkspace,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceTransferOwnershipUseCase', () => {
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const member: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        roleId: 'role-workspace-owner',
        role: {
            id: 'role-workspace-owner',
            scope: EnumRoleScope.workspace,
            key: 'owner',
            name: 'owner',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceTransferOwnershipUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceTransferOwnershipUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceTransferOwnershipUseCase);
    });

    describe('execute', () => {
        it('authorizes the manage on the context workspace before any write', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                { targetUserId: 'user-2' }
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.manage,
                expect.objectContaining({
                    __caslSubjectType__: 'Workspace',
                    id: workspaceContext.workspace.id,
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                workspaceMemberService.transferOwnership
            );
        });

        it('rejects with the forbidden error and writes nothing when the ability denies the manage', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    { targetUserId: 'user-2' }
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                workspaceMemberService.transferOwnership
            ).not.toHaveBeenCalled();
        });

        it('transfers with the context', async () => {
            const body: WorkspaceTransferOwnershipRequestDto = {
                targetUserId: 'user-2',
            };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.transferOwnership
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                member,
                'user-2'
            );
        });

        it('rejects with the transfer failure', async () => {
            workspaceMemberService.transferOwnership.mockRejectedValue(
                new WorkspaceSelfTransferException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    {
                        targetUserId: 'user-1',
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceSelfTransferException);
        });
    });
});
