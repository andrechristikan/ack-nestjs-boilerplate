import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
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

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;

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
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateSlugUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateSlugUseCase);
    });

    describe('execute', () => {
        const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };

        it('asserts the slug, updates it in one transaction, and wraps the project in the response envelope', async () => {
            const updated = { ...project, slug: 'p-new-slug' };
            projectService.updateProjectSlugInTx.mockResolvedValue(updated);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext,
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.assertSlugAllowed).toHaveBeenCalledWith(
                'p-new-slug'
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectService.updateProjectSlugInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                'p-new-slug'
            );
        });

        it('throws ProjectSlugInvalidException and opens no transaction when the slug is not allowed', async () => {
            projectService.assertSlugAllowed.mockImplementation(() => {
                throw new ProjectSlugInvalidException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('passes a rejected typed exception through untouched', async () => {
            const typed = new ProjectSlugInvalidException();
            projectService.updateProjectSlugInTx.mockRejectedValue(typed);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext,
                    body
                )
            ).rejects.toBe(typed);
        });
    });
});
