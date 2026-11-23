import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateUseCase } from '@modules/workspace/use-cases/workspace.update.use-case';
import {
    buildUser,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceUpdateUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
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
        isPublic: false,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1', EnumRoleWorkspaceKey.owner)
    );
    let useCase: WorkspaceUpdateUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateUseCase);
    });

    describe('execute', () => {
        it('authorizes the update on the context workspace before the write', async () => {
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                { name: 'Acme 2', description: null }
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                expect.objectContaining({
                    __caslSubjectType__: 'Workspace',
                    id: 'workspace-1',
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                workspaceService.updateWorkspace
            );
        });

        it('rejects with the forbidden error and writes nothing when the ability denies the update', async () => {
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
                    { name: 'Acme 2', description: null }
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceService.updateWorkspace).not.toHaveBeenCalled();
        });

        it('writes the details of the context workspace with the context context and wraps the workspace', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: 'Our team workspace',
            };
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                { name: 'Acme 2', description: 'Our team workspace' }
            );
        });

        it('passes a null description through to clear it', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: null,
            };
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                body
            );

            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                { name: 'Acme 2', description: null }
            );
        });

        it('rejects with the write failure', async () => {
            workspaceService.updateWorkspace.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    {
                        name: 'Acme 2',
                        description: null,
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        });
    });
});
