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
import type { Project } from '@generated/prisma-client/client';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { ProjectAssignMemberUseCase } from '@modules/project/use-cases/project.assign-member.use-case';
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

describe('ProjectAssignMemberUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();

    let useCase: ProjectAssignMemberUseCase;

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

    const projectMemberRow: IProjectMember = {
        id: '507f1f77bcf86cd799439021',
        projectId: project.id,
        userId: '507f1f77bcf86cd799439022',
        roleId: 'role-project-member',
        role: {
            id: 'role-project-member',
            scope: EnumRoleScope.project,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: '507f1f77bcf86cd799439022',
            name: 'Jane Smith',
            username: 'meadowlark',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
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
        projectUtil.mapMemberActor.mockReturnValue(actor);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectAssignMemberUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectAssignMemberUseCase);
    });

    describe('execute', () => {
        const body: ProjectMemberAssignRequestDto = {
            userId: '507f1f77bcf86cd799439022',
            roleId: 'role-project-member',
        };
        const targetMember: IWorkspaceMemberWithRole = {
            id: '507f1f77bcf86cd799439031',
            workspaceId: project.workspaceId,
            userId: body.userId,
            roleId: 'role-workspace-member',
            role: {
                id: 'role-workspace-member',
                scope: EnumRoleScope.workspace,
                key: 'member',
                name: 'member',
                policyRevision: 0,
            },
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        };

        it('resolves the target workspace member and assigns them with the context, wrapping the result', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                targetMember
            );
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberService.assignMember.mockResolvedValue(created);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext,
                body
            );

            expect(result).toEqual({ data: created });
            expect(
                workspaceMemberService.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith(project.workspaceId, body.userId);
            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.assignMember).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                actor,
                targetMember,
                body.roleId
            );
        });

        it('authorizes the prospective project member create before any lookup', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                targetMember
            );
            projectMemberService.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext,
                body
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.create,
                expect.objectContaining({
                    __caslSubjectType__: 'ProjectMember',
                    projectId: project.id,
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                workspaceMemberService.getOneByWorkspaceAndUser
            );
        });

        it('passes a null target member when the workspace holds none', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberService.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext,
                body
            );

            expect(projectMemberService.assignMember).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                actor,
                null,
                body.roleId
            );
        });

        it('rejects with the domain failure', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberService.assignMember.mockRejectedValue(
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
                    body
                )
            ).rejects.toThrow('boom');
        });
    });
});
