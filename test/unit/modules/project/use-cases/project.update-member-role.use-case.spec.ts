import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectUpdateMemberRoleUseCase } from '@modules/project/use-cases/project.update-member-role.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUpdateMemberRoleUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const context = buildRequestContext('507f1f77bcf86cd799439033');

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    let useCase: ProjectUpdateMemberRoleUseCase;

    const actorMember: WorkspaceMember = {
        id: '507f1f77bcf86cd799439034',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439033',
        role: EnumWorkspaceMemberRole.admin,
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

    beforeEach(async () => {
        vi.resetAllMocks();
        projectUtil.mapMemberActor.mockReturnValue(actor);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateMemberRoleUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
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
                project,
                actorMember,
                '507f1f77bcf86cd799439021',
                body,
                context
            );

            expect(result).toEqual({});
            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.updateMemberRole).toHaveBeenCalledWith(
                project,
                actor,
                '507f1f77bcf86cd799439021',
                body.role,
                context
            );
        });

        it('rejects with the domain failure', async () => {
            projectMemberService.updateMemberRole.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    project,
                    actorMember,
                    '507f1f77bcf86cd799439021',
                    { role: EnumProjectMemberRole.admin },
                    context
                )
            ).rejects.toThrow('boom');
        });
    });
});
