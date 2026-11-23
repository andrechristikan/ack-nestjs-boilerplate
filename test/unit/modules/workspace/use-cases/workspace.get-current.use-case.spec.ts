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
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';
import {
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceGetCurrentUseCase', () => {
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
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1')
    );
    let useCase: WorkspaceGetCurrentUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetCurrentUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetCurrentUseCase);
    });

    describe('execute', () => {
        it('authorizes the read on the context workspace', async () => {
            await useCase.execute(workspaceContext, policyContext);

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                expect.objectContaining({
                    __caslSubjectType__: 'Workspace',
                    id: 'workspace-1',
                })
            );
        });

        it('rejects with the forbidden error when the ability denies the read', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(workspaceContext, policyContext)
            ).rejects.toThrow(PolicyForbiddenException);
        });

        it('wraps the current workspace in the response envelope', async () => {
            const result = await useCase.execute(
                workspaceContext,
                policyContext
            );

            expect(result).toEqual({ data: workspace });
        });
    });
});
