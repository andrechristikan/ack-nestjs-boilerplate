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
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUpdateSlugUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));

    let useCase: ProjectUpdateSlugUseCase;

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

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('507f1f77bcf86cd799439015', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const projectContext = buildProjectContext(project, null);

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateSlugUseCase,
                { provide: ProjectService, useValue: projectService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateSlugUseCase);
    });

    describe('execute', () => {
        it('authorizes the update on the context project before the write', async () => {
            projectService.updateProjectSlug.mockResolvedValue(project);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext,
                policyContext,
                { slug: 'p-new-slug' }
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                expect.objectContaining({
                    __caslSubjectType__: 'Project',
                    id: project.id,
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                projectService.updateProjectSlug
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
                    projectContext,
                    policyContext,
                    { slug: 'p-new-slug' }
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(projectService.updateProjectSlug).not.toHaveBeenCalled();
        });

        it('updates the slug with the actor and the context and wraps it in the response envelope', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            const updated = { ...project, slug: 'p-new-slug' };
            projectService.updateProjectSlug.mockResolvedValue(updated);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext,
                policyContext,
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.updateProjectSlug).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                'p-new-slug'
            );
        });

        it('rejects with the domain failure', async () => {
            projectService.updateProjectSlug.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext,
                    policyContext,
                    { slug: 'p-new-slug' }
                )
            ).rejects.toThrow('boom');
        });
    });
});
