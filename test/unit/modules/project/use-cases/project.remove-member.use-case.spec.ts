import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectRemoveMemberUseCase } from '@modules/project/use-cases/project.remove-member.use-case';
import {
    buildUser,
    buildWorkspace,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('ProjectRemoveMemberUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'ProjectMember'> = { id: 'scoped-1' };
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    let useCase: ProjectRemoveMemberUseCase;

    const actorMember: IWorkspaceMemberWithRole = {
        id: '507f1f77bcf86cd799439034',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439033',
        roleId: 'role-workspace-admin',
        role: {
            id: 'role-workspace-admin',
            scope: EnumRoleScope.workspace,
            key: 'admin',
            name: 'admin',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const actor: IProjectMemberActor = {
        userId: actorMember.userId,
        hasWorkspaceBypass: true,
    };

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
        buildUser('507f1f77bcf86cd799439033', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        { ...buildWorkspace(), id: project.workspaceId },
        actorMember
    );
    const projectContext = buildProjectContext(project, null);

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        projectUtil.mapMemberActor.mockReturnValue(actor);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                ProjectRemoveMemberUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
            ],
        }).compile();

        useCase = module.get(ProjectRemoveMemberUseCase);
    });

    describe('execute', () => {
        it('maps the actor and delegates the removal with the context', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext,
                '507f1f77bcf86cd799439021'
            );

            expect(result).toEqual({});
            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.removeMember).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                actor,
                '507f1f77bcf86cd799439021',
                scoped
            );
        });

        it('rejects with the domain failure', async () => {
            projectMemberService.removeMember.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    projectContext,
                    policyContext,
                    '507f1f77bcf86cd799439021'
                )
            ).rejects.toThrow('boom');
        });
    });
});
