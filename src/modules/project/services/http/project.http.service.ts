import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectHttpService {
    constructor(
        private readonly projectDomain: ProjectDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async getListCursorByMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        query: ProjectUserListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectWhereInput>(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectDomain.getListCursorByMember(
                workspaceId,
                workspaceMember,
                params
            );

        return {
            data,
            ...others,
        };
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectCreated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const project = await this.projectDomain.createProject(workspaceId, {
            name,
            description: description ?? null,
        });

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: project };
    }

    getProject(project: Project): IResponseReturn<Project> {
        return { data: project };
    }

    async updateProject(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const updated = await this.projectDomain.updateProject(project, {
            name,
            description,
        });

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: updated };
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        { slug }: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<Project>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const updated = await this.projectDomain.updateProjectSlug(
            project,
            slug
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: updated };
    }

    async softDeleteProject(
        project: Project,
        actorId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const deletedAt = this.helperDateService.create();
        await this.databaseService.withTransaction(async tx => {
            await this.projectDomain.softDeleteProjectInTx(
                tx,
                project,
                deletedAt
            );
            await this.workspaceInviteDomain.clearProjectInTx(tx, project.id);
        });

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async getListOffsetByAdmin(
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ProjectWhereInput>(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectDefaultAvailableOrderBy,
            });
        const workspaceId = query.workspaceId ?? null;
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(workspaceId ? { workspaceId } : {}),
            },
        });

        const { data, ...others } =
            await this.projectDomain.getListOffsetByAdmin(params, workspaceId);

        return {
            data,
            ...others,
        };
    }

    async getByIdByAdmin(projectId: string): Promise<IResponseReturn<Project>> {
        const project = await this.projectDomain.getByIdByAdmin(projectId);

        return { data: project };
    }
}
