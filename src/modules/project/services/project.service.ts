import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Project, WorkspaceMember } from '@generated/prisma-client';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { IProjectService } from '@modules/project/interfaces/project.service.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectService implements IProjectService {
    private readonly slugPattern: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.slugPattern = this.configService.get<RegExp>(
            'project.slugPattern'
        )!;
        this.slugPrefix = this.configService.get<string>('project.slugPrefix')!;
        this.slugMaxLength = this.configService.get<number>(
            'project.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'project.slugMaxAttempts'
        )!;
    }

    private drawSlugCandidates(): string[] {
        return Array.from({ length: this.slugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.slugPrefix,
                this.slugMaxLength
            )
        );
    }

    private assertSlugAllowed(slug: string): void {
        if (slug.length > this.slugMaxLength || !this.slugPattern.test(slug)) {
            throw new ProjectSlugInvalidException();
        }
    }

    async validateProjectGuard(
        workspaceId: string | null,
        projectId: string | null
    ): Promise<Project> {
        if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        } else if (!projectId) {
            throw new ProjectNotFoundException();
        }

        const project = await this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId
        );
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }

    /** Lists projects in the workspace: a workspace `owner` sees every project, everyone else sees only the ones they hold a `ProjectMember` row for. */
    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        const memberUserId = this.projectUtil.isWorkspaceOwner(workspaceMember)
            ? null
            : workspaceMember.userId;

        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            memberUserId,
            pagination
        );
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        create: IProjectCreate
    ): Promise<Project> {
        const requestLog = this.projectUtil.getCurrentRequestLog();

        if (create.slug) {
            this.assertSlugAllowed(create.slug);

            const slugTaken =
                await this.projectRepository.existsBySlugInWorkspace(
                    workspaceId,
                    create.slug
                );
            if (slugTaken) {
                throw new ProjectSlugAlreadyExistsException();
            }
        }

        return this.projectRepository.createWithSlug(
            workspaceId,
            actorId,
            create,
            this.drawSlugCandidates(),
            requestLog
        );
    }

    getProject(project: Project): Project {
        return project;
    }

    async updateProject(
        project: Project,
        actorId: string,
        update: IProjectUpdate
    ): Promise<Project> {
        const requestLog = this.projectUtil.getCurrentRequestLog();

        return this.projectRepository.updateDetails(
            project.id,
            project.workspaceId,
            actorId,
            update,
            requestLog
        );
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        slug: string
    ): Promise<Project> {
        const requestLog = this.projectUtil.getCurrentRequestLog();

        this.assertSlugAllowed(slug);

        const slugTaken = await this.projectRepository.existsBySlugInWorkspace(
            project.workspaceId,
            slug,
            project.id
        );
        if (slugTaken) {
            throw new ProjectSlugAlreadyExistsException();
        }

        return this.projectRepository.updateSlug(
            project.id,
            project.workspaceId,
            actorId,
            slug,
            requestLog
        );
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        const requestLog = this.projectUtil.getCurrentRequestLog();

        await this.projectRepository.softDelete(
            project.id,
            project.workspaceId,
            actorId,
            requestLog
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetForAdmin(
            pagination,
            workspaceId
        );
    }

    async getByIdForAdmin(projectId: string): Promise<Project> {
        const project =
            await this.projectRepository.findByIdForAdmin(projectId);
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }
}
