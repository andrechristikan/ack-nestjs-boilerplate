import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project } from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectGetByIdByAdminUseCase } from '@modules/project/use-cases/project.get-by-id-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('ProjectGetByIdByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'Project'> = { id: 'scoped-1' };
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    let useCase: ProjectGetByIdByAdminUseCase;

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

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                ProjectGetByIdByAdminUseCase,
                { provide: ProjectService, useValue: projectService },
            ],
        }).compile();

        useCase = module.get(ProjectGetByIdByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the resolved project in the response envelope', async () => {
            projectService.getByIdByAdmin.mockResolvedValue(project);

            const result = await useCase.execute(
                policyContext,
                '507f1f77bcf86cd799439011'
            );

            expect(result).toEqual({ data: project });
            expect(projectService.getByIdByAdmin).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                scoped
            );
        });
    });
});
