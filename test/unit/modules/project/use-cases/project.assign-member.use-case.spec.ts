import { ConfigService } from '@nestjs/config';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { ProjectAssignMemberUseCase } from '@modules/project/use-cases/project.assign-member.use-case';
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

describe('ProjectAssignMemberUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;

    let useCase: ProjectAssignMemberUseCase;

    const actorMember: WorkspaceMember = buildWorkspaceMember(
        '507f1f77bcf86cd799439033'
    );

    const actor: IProjectMemberActor = {
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
        role: EnumProjectMemberRole.member,
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
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

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
                ProjectUtil,
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ProjectAssignMemberUseCase);
    });

    describe('execute', () => {
        const body: ProjectMemberAssignRequestDto = {
            userId: '507f1f77bcf86cd799439022',
            role: EnumProjectMemberRole.member,
        };
        const targetMember: WorkspaceMember = buildWorkspaceMember(body.userId);

        const args = [
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            body,
        ] as const;

        beforeEach(() => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                targetMember
            );
            projectMemberService.assertAssignable.mockReturnValue(targetMember);
        });

        it('resolves the target, asserts it assignable, then assigns it in one transaction on one tx', async () => {
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberService.assignMemberInTx.mockResolvedValue(created);

            const result = await useCase.execute(...args);

            expect(result).toEqual({ data: created });
            expect(
                workspaceMemberService.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith(project.workspaceId, body.userId);
            expect(projectMemberService.assertAssignable).toHaveBeenCalledWith(
                project,
                actor,
                targetMember,
                body.role
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectMemberService.assignMemberInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                targetMember,
                body.role
            );
        });

        it('rethrows the assert exception and opens no transaction', async () => {
            const failure = new WorkspaceMemberNotFoundException();
            projectMemberService.assertAssignable.mockImplementation(() => {
                throw failure;
            });

            await expect(useCase.execute(...args)).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a unique collision on userId to ProjectMemberAlreadyAssignedException', async () => {
            projectMemberService.assignMemberInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'userId')
            );

            await expect(useCase.execute(...args)).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
            });
        });

        it('rethrows an AppBaseException from the transaction as is', async () => {
            const failure = new DatabaseWriteConflictException();
            projectMemberService.assignMemberInTx.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            projectMemberService.assignMemberInTx.mockRejectedValue(otherError);

            await expect(useCase.execute(...args)).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });
    });
});
