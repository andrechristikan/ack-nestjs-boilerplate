import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceHttpService {
    private readonly deleteTimeoutInMs: number;

    constructor(
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly userDomain: UserDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.deleteTimeoutInMs = this.configService.get<number>(
            'workspace.delete.timeoutInMs'
        )!;
    }

    async getListCursorByMember(
        userId: string,
        query: WorkspaceUserListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceWhereInput>(query, {
                scope: WorkspaceUserListCursorScope,
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceDomain.getListCursorByMember(userId, params);

        return {
            data,
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.createWorkspace(userId, {
            name,
            description: description ?? null,
            isPublic: isPublic ?? null,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: workspace };
    }

    getCurrentWorkspace(workspace: Workspace): IResponseReturn<Workspace> {
        return { data: workspace };
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const workspace = await this.workspaceDomain.updateWorkspace(
            workspaceId,
            { name, description }
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: workspace };
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        { isPublic }: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const workspace = await this.workspaceDomain.updateWorkspaceIsPublic(
            workspaceId,
            isPublic
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: workspace };
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const workspace = await this.workspaceDomain.updateWorkspaceSlug(
            workspaceId,
            slug
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: workspace };
    }

    async switchWorkspace(
        userId: string,
        { workspaceId }: WorkspaceSwitchRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.workspaceDomain.validateWorkspaceGuard(workspaceId);
        await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
            workspaceId,
            userId
        );

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceSwitched,
                userId,
                createdBy: userId,
                workspaceId,
            }),
        ];

        await this.userDomain.setLastWorkspace(userId, workspaceId);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const deletedAt = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await this.workspaceDomain.softDeleteInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.projectDomain.softDeleteByWorkspaceInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.workspaceInviteDomain.revokePendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    await this.workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                },
                { timeout: this.deleteTimeoutInMs }
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async getListOffsetByAdmin(
        query: WorkspaceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceWhereInput>(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
        const isPublic = this.paginationFilterUtil.equalBoolean(
            Prisma.WorkspaceScalarFieldEnum.isPublic,
            query.isPublic
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isPublic?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceDomain.getListOffsetByAdmin(
                params,
                isPublic?.where
            );

        return {
            data,
            ...others,
        };
    }

    async getByIdByAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        const workspace =
            await this.workspaceDomain.getByIdByAdmin(workspaceId);

        return { data: workspace };
    }

    async previewWorkspace(slug: string): Promise<IResponseReturn<Workspace>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'joinRequestAllowed'
        );
        const workspace = await this.workspaceDomain.previewWorkspace(slug);

        return { data: workspace };
    }
}
