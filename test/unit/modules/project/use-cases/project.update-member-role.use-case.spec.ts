import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectUpdateMemberRoleUseCase } from '@modules/project/use-cases/project.update-member-role.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildProjectContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUpdateMemberRoleUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    let useCase: ProjectUpdateMemberRoleUseCase;

    const actorMember: WorkspaceMember = buildWorkspaceMember(
        '507f1f77bcf86cd799439033'
    );

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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateMemberRoleUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                ProjectUtil,
            ],
        }).compile();

        useCase = module.get(ProjectUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        it('maps the actor and delegates the role update with the context', async () => {
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                '507f1f77bcf86cd799439021',
                body
            );

            expect(result).toEqual({});
            expect(projectMemberService.updateMemberRole).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                actor,
                '507f1f77bcf86cd799439021',
                body.role
            );
        });

        it('rejects with the domain failure', async () => {
            projectMemberService.updateMemberRole.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    projectContext,
                    '507f1f77bcf86cd799439021',
                    {
                        role: EnumProjectMemberRole.admin,
                    }
                )
            ).rejects.toThrow('boom');
        });
    });
});
