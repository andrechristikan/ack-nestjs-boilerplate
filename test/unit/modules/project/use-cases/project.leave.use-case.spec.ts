import { ConfigService } from '@nestjs/config';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
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

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;

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
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectLeaveUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ProjectLeaveUseCase);
    });

    describe('execute', () => {
        const member: ProjectMember = {
            id: '507f1f77bcf86cd799439021',
            projectId: project.id,
            userId: '507f1f77bcf86cd799439022',
            role: EnumProjectMemberRole.member,
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

        it('asserts the member, then removes it in one transaction on one tx', async () => {
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectMemberService.leaveProjectInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                member
            );
        });

        it('throws the member assert exception and opens no transaction when the context carries no member', async () => {
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
            });
            expect(projectMemberService.assertMember).toHaveBeenCalledWith(
                null
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('passes a rejected typed exception through untouched', async () => {
            const failure = new ProjectMemberNotFoundException();
            projectMemberService.assertMember.mockReturnValue(member);
            projectMemberService.leaveProjectInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext
                )
            ).rejects.toBe(failure);
        });
    });
});
