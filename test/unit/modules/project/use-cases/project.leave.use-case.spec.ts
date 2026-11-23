import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectLeaveUseCase } from '@modules/project/use-cases/project.leave.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectLeaveUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    let useCase: ProjectLeaveUseCase;

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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectLeaveUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectLeaveUseCase);
    });

    describe('execute', () => {
        const member: IProjectMemberWithRole = {
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
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(
            buildUser(member.userId, 'jane@example.com')
        );
        const authContext = buildAuthJwtAccessContext(userContext.user.id);
        const projectContext = buildProjectContext(project, member);

        it('delegates leaving the project to the domain with the asserted member', async () => {
            projectMemberService.assertMember.mockReturnValue(member);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext
            );

            expect(result).toEqual({});
            expect(projectMemberService.assertMember).toHaveBeenCalledWith(
                member
            );
            expect(projectMemberService.leaveProject).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                member
            );
        });

        it('throws the member assert exception when the context carries no member', async () => {
            const projectContextWithoutMember = {
                ...projectContext,
                projectMember: null,
            };
            projectMemberService.assertMember.mockImplementation(() => {
                throw new ProjectMemberNotFoundException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContextWithoutMember
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey: 'memberNotFound',
                messagePath: 'project.error.memberNotFound',
            });
            expect(projectMemberService.assertMember).toHaveBeenCalledWith(
                null
            );
            expect(projectMemberService.leaveProject).not.toHaveBeenCalled();
        });

        it('rejects with the domain failure', async () => {
            projectMemberService.assertMember.mockReturnValue(member);
            projectMemberService.leaveProject.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext
                )
            ).rejects.toThrow('boom');
        });
    });
});
