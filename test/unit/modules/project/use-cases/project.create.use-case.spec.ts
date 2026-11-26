import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectCreateUseCase } from '@modules/project/use-cases/project.create.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectCreateUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;

    let useCase: ProjectCreateUseCase;

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
    const workspaceContext = buildWorkspaceContext(
        { ...buildWorkspace(), id: '507f1f77bcf86cd799439012' },
        buildWorkspaceMember('507f1f77bcf86cd799439015')
    );

    beforeEach(async () => {
        projectService.drawSlugCandidates.mockReturnValue([
            'p-abc123',
            'p-def456',
        ]);
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectCreateUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ProjectCreateUseCase);
    });

    describe('execute', () => {
        const body: ProjectCreateRequestDto = {
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        };

        it('creates the project on the first slug candidate in one transaction and wraps it in the response envelope', async () => {
            projectService.createProjectInTx.mockResolvedValue(project);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: project });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectService.createProjectInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                {
                    name: 'Website Revamp',
                    description: 'Marketing site redesign',
                },
                'p-abc123'
            );
        });

        it('passes null for an omitted description', async () => {
            projectService.createProjectInTx.mockResolvedValue(project);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                { name: 'Website Revamp' }
            );

            expect(projectService.createProjectInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                { name: 'Website Revamp', description: null },
                'p-abc123'
            );
        });

        it('opens a second transaction with the next slug candidate after a slug collision and returns its project', async () => {
            projectService.createProjectInTx
                .mockRejectedValueOnce(new ProjectSlugAlreadyExistsException())
                .mockResolvedValueOnce(project);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: project });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(projectService.createProjectInTx).toHaveBeenNthCalledWith(
                2,
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                {
                    name: 'Website Revamp',
                    description: 'Marketing site redesign',
                },
                'p-def456'
            );
        });

        it('throws AppUnknownException carrying the last collision when every slug candidate collides', async () => {
            const collision = new ProjectSlugAlreadyExistsException();
            projectService.createProjectInTx.mockRejectedValue(collision);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: collision,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('passes a rejected typed exception other than the slug collision through untouched without retrying', async () => {
            const typed = new ProjectNotFoundException();
            projectService.createProjectInTx.mockRejectedValue(typed);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBe(typed);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('wraps a non-collision failure in AppUnknownException without retrying', async () => {
            const otherError = new Error('unexpected');
            projectService.createProjectInTx.mockRejectedValue(otherError);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });
    });
});
