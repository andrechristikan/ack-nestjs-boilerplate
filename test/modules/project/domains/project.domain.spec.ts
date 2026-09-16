import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction, type Project } from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { ConfigService } from '@nestjs/config';
import { createDatabaseServiceMock } from '@test/support/database.mock';

describe('ProjectDomain', () => {
    const repository = createMock<ProjectRepository>();
    const projectUtil = createMock<ProjectUtil>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();
    const databaseUtil = createMock<DatabaseUtil>();
    const helperDateService = createMock<HelperDateService>();
    const helperStringService = createMock<HelperStringService>();
    const configService = createMock<ConfigService>();
    const project = createMock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
        slug: 'project-slug',
    });

    let domain: ProjectDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        configService.get.mockImplementation(key => {
            if (key === 'project.slugRegex') return /^[a-z-]+$/;
            if (key === 'project.slugPrefix') return 'project';
            if (key === 'project.slugMaxLength') return 20;
            if (key === 'project.slugMaxAttempts') return 2;
            return undefined;
        });
        helperStringService.generateSlug
            .mockReturnValueOnce('first-slug')
            .mockReturnValueOnce('second-slug');
        domain = new ProjectDomain(
            repository,
            projectUtil,
            activityLogDomain,
            databaseService,
            databaseUtil,
            helperDateService,
            helperStringService,
            configService
        );
    });

    it('rejects project validation without workspace or project context', async () => {
        await expect(
            domain.validateProjectGuard(null, 'project-id')
        ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        await expect(
            domain.validateProjectGuard('workspace-id', null)
        ).rejects.toBeInstanceOf(ProjectNotFoundException);
    });

    it('rejects a project outside the active workspace', async () => {
        repository.findActiveByIdAndWorkspace.mockResolvedValue(null);
        await expect(
            domain.validateProjectGuard('workspace-id', 'project-id')
        ).rejects.toBeInstanceOf(ProjectNotFoundException);
    });

    it('creates a project and stages its activity', async () => {
        repository.createInTx.mockResolvedValue(project);
        await expect(
            domain.createProject('workspace-id', 'actor-id', {
                name: 'Project',
            })
        ).resolves.toBe(project);
        expect(repository.createInTx).toHaveBeenCalledWith(
            expect.anything(),
            'workspace-id',
            'actor-id',
            { name: 'Project' },
            'first-slug'
        );
        expect(activityLogDomain.stage).toHaveBeenCalledWith({
            action: EnumActivityLogAction.projectCreated,
            userId: 'actor-id',
            workspaceId: 'workspace-id',
        });
    });

    it('retries a slug collision and returns the second creation', async () => {
        repository.createInTx
            .mockRejectedValueOnce(new Error('collision'))
            .mockResolvedValueOnce(project);
        databaseUtil.isUniqueCollision.mockReturnValueOnce(true);
        await expect(
            domain.createProject('workspace-id', 'actor-id', {
                name: 'Project',
            })
        ).resolves.toBe(project);
        expect(repository.createInTx).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            'workspace-id',
            'actor-id',
            { name: 'Project' },
            'second-slug'
        );
    });

    it('throws after all generated slugs collide', async () => {
        repository.createInTx.mockRejectedValue(new Error('collision'));
        databaseUtil.isUniqueCollision.mockReturnValue(true);
        await expect(
            domain.createProject('workspace-id', 'actor-id', {
                name: 'Project',
            })
        ).rejects.toBeInstanceOf(DatabaseUniqueValueGenerationFailedException);
    });

    it.each(['INVALID!', 'this-slug-is-far-too-long'])(
        'rejects invalid project slug %s',
        async slug => {
            await expect(
                domain.updateProjectSlug(project, 'actor-id', slug)
            ).rejects.toBeInstanceOf(ProjectSlugInvalidException);
            expect(repository.existsBySlugInWorkspace).not.toHaveBeenCalled();
        }
    );

    it('rejects an existing project slug in the workspace', async () => {
        repository.existsBySlugInWorkspace.mockResolvedValue(true);
        await expect(
            domain.updateProjectSlug(project, 'actor-id', 'valid-slug')
        ).rejects.toBeInstanceOf(ProjectSlugAlreadyExistsException);
    });
});
