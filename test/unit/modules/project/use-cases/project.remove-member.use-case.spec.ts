import { ConfigService } from '@nestjs/config';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
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
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectRemoveMemberUseCase } from '@modules/project/use-cases/project.remove-member.use-case';
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

describe('ProjectRemoveMemberUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;

    let useCase: ProjectRemoveMemberUseCase;

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
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectRemoveMemberUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
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

        useCase = module.get(ProjectRemoveMemberUseCase);
    });

    describe('execute', () => {
        const targetMemberId = '507f1f77bcf86cd799439021';
        const targetMember: ProjectMember = {
            id: targetMemberId,
            projectId: project.id,
            userId: '507f1f77bcf86cd799439022',
            role: EnumProjectMemberRole.member,
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        };

        const args = [
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            targetMemberId,
        ] as const;

        it('reads the removable member, then removes it in one transaction on one tx', async () => {
            projectMemberService.getRemovableMember.mockResolvedValue(
                targetMember
            );

            const result = await useCase.execute(...args);

            expect(result).toEqual({});
            expect(
                projectMemberService.getRemovableMember
            ).toHaveBeenCalledWith(project, actor, targetMemberId);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectMemberService.removeMemberInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                actor,
                targetMember
            );
        });

        it('rethrows the check exception and opens no transaction', async () => {
            const failure = new ProjectMemberNotFoundException();
            projectMemberService.getRemovableMember.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a write conflict to ProjectMemberPeerForbiddenException', async () => {
            projectMemberService.getRemovableMember.mockResolvedValue(
                targetMember
            );
            projectMemberService.removeMemberInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(useCase.execute(...args)).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('rethrows an AppBaseException from the transaction as is', async () => {
            const failure = new ProjectMemberPeerForbiddenException();
            projectMemberService.getRemovableMember.mockResolvedValue(
                targetMember
            );
            projectMemberService.removeMemberInTx.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const otherError = new Error('boom');
            projectMemberService.getRemovableMember.mockResolvedValue(
                targetMember
            );
            projectMemberService.removeMemberInTx.mockRejectedValue(otherError);

            await expect(useCase.execute(...args)).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });
    });
});
