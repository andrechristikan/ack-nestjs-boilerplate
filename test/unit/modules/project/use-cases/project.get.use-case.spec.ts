import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectGetUseCase } from '@modules/project/use-cases/project.get.use-case';
import { buildProjectContext } from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('ProjectGetUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    let useCase: ProjectGetUseCase;

    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'Project'> = { id: 'scoped-1' };

    const project: Project = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        name: 'Website Revamp',
        slug: 'p-abc123',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const projectContext = buildProjectContext(project, null);

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        projectService.getScopedByIdAndWorkspace.mockResolvedValue(project);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGetUseCase,
                { provide: ProjectService, useValue: projectService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectGetUseCase);
    });

    describe('execute', () => {
        it('loads the project through the read scope and wraps it', async () => {
            const result = await useCase.execute(projectContext, policyContext);

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.Project
            );
            expect(
                projectService.getScopedByIdAndWorkspace
            ).toHaveBeenCalledWith(project.id, project.workspaceId, scoped);
            expect(result).toEqual({ data: project });
        });
    });
});
