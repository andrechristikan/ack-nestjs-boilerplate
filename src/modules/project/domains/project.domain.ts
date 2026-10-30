import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectDomain {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async validateProjectGuard(
        workspaceId: string,
        projectId: string | null
    ): Promise<Project> {
        if (!projectId) {
            throw new RequestContextMissingException('params.projectId');
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

    async getActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        return this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId
        );
    }

    /** Lists projects in the workspace: a workspace `owner` or `admin` sees every project, everyone else sees only the ones they hold a `ProjectMember` row for. */
    async getListCursorByMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePaginationReturn<Project>> {
        const hasWorkspaceBypass =
            this.projectUtil.hasWorkspaceBypass(workspaceMember);
        const memberUserId = hasWorkspaceBypass ? null : workspaceMember.userId;

        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            memberUserId,
            pagination
        );
    }

    async createProject(
        workspaceId: string,
        create: IProjectCreate
    ): Promise<Project> {
        const slugCandidates = this.projectUtil.drawSlugCandidates();

        return this.projectRepository.create(
            workspaceId,
            create,
            slugCandidates
        );
    }

    async updateProject(
        project: Project,
        update: IProjectUpdate
    ): Promise<Project> {
        return this.projectRepository.updateDetails(project.id, update);
    }

    async updateProjectSlug(project: Project, slug: string): Promise<Project> {
        const isSlugAllowed = this.projectUtil.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new ProjectSlugInvalidException();
        }

        // Sequential by design: gate before the work it guards
        const slugTaken = await this.projectRepository.existsBySlugInWorkspace(
            project.workspaceId,
            slug,
            project.id
        );
        if (slugTaken) {
            throw new ProjectSlugAlreadyExistsException();
        }

        return this.projectRepository.updateSlug(project.id, slug);
    }

    async softDeleteProject(project: Project): Promise<void> {
        const deletedAt = this.helperDateService.create();

        await this.projectRepository.softDelete(project.id, deletedAt);
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        await this.projectRepository.softDeleteByWorkspaceInTx(
            tx,
            workspaceId,
            deletedAt,
            deletedBy
        );
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId: string | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetByAdmin(
            pagination,
            workspaceId
        );
    }

    async getByIdByAdmin(projectId: string): Promise<Project> {
        const project = await this.projectRepository.findByIdByAdmin(projectId);
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }
}
