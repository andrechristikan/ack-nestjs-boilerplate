import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

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

describe('ProjectDomain', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
        slug: 'project-slug',
    });

    let domain: ProjectDomain;

    beforeEach(async () => {
        configGet.mockImplementation((key: string) => {
            if (key === 'project.slugRegex') return /^[a-z-]+$/;
            if (key === 'project.slugPrefix') return 'project';
            if (key === 'project.slugMaxLength') return 20;
            if (key === 'project.slugMaxAttempts') return 2;
            return undefined;
        });
        helperStringService.generateSlug
            .mockReturnValueOnce('first-slug')
            .mockReturnValueOnce('second-slug');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectDomain,
                { provide: ProjectRepository, useValue: projectRepository },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        domain = module.get(ProjectDomain);
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
        projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(null);
        await expect(
            domain.validateProjectGuard('workspace-id', 'project-id')
        ).rejects.toBeInstanceOf(ProjectNotFoundException);
    });

    it('creates a project and stages its activity', async () => {
        projectRepository.create.mockResolvedValue(project);
        await expect(
            domain.createProject('workspace-id', 'actor-id', {
                name: 'Project',
            })
        ).resolves.toBe(project);
        expect(projectRepository.create).toHaveBeenCalledWith(
            'workspace-id',
            { name: 'Project' },
            ['first-slug', 'second-slug']
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.projectCreated,
            userId: 'actor-id',
            createdBy: 'actor-id',
            workspaceId: 'workspace-id',
        });
    });

    it.each(['INVALID!', 'this-slug-is-far-too-long'])(
        'rejects invalid project slug %s',
        async slug => {
            await expect(
                domain.updateProjectSlug(project, 'actor-id', slug)
            ).rejects.toBeInstanceOf(ProjectSlugInvalidException);
            expect(
                projectRepository.existsBySlugInWorkspace
            ).not.toHaveBeenCalled();
        }
    );

    it('rejects an existing project slug in the workspace', async () => {
        projectRepository.existsBySlugInWorkspace.mockResolvedValue(true);
        await expect(
            domain.updateProjectSlug(project, 'actor-id', 'valid-slug')
        ).rejects.toBeInstanceOf(ProjectSlugAlreadyExistsException);
    });
});
