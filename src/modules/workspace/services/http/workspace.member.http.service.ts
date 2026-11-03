import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberHttpService {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly userDomain: UserDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: targetUserId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];

        await this.workspaceMemberDomain.transferOwnership(
            workspaceId,
            actorMember,
            targetUserId
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId,
            }),
        ];

        try {
            await this.databaseService.withTransaction(async tx => {
                await this.workspaceMemberDomain.leaveWorkspaceInTx(
                    tx,
                    workspaceId,
                    member
                );
                await this.projectMemberDomain.removeByWorkspaceAndUserInTx(
                    tx,
                    workspaceId,
                    member.userId
                );
                await this.workspaceJoinRequestDomain.cancelPendingByUserInTx(
                    tx,
                    workspaceId,
                    member.userId
                );
                await this.userDomain.clearLastWorkspaceInTx(
                    tx,
                    member.userId,
                    workspaceId
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async getMembersList(
        workspaceId: string,
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceMemberWhereInput>(
                query,
                { availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy }
            );
        const role = this.paginationQueryUtil.inEnum(
            Prisma.WorkspaceMemberScalarFieldEnum.role,
            query.role,
            WorkspaceMemberDefaultRole
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(role?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersList(
                workspaceId,
                params,
                role?.where
            );

        return {
            data,
            ...others,
        };
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const targetMember = await this.workspaceMemberDomain.updateMemberRole(
            workspaceId,
            actorMember,
            targetMemberId,
            role
        );

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        let targetMember: WorkspaceMember;
        try {
            targetMember = await this.databaseService.withTransaction(
                async tx => {
                    const removed =
                        await this.workspaceMemberDomain.removeMemberInTx(
                            tx,
                            workspaceId,
                            actorMember,
                            targetMemberId
                        );
                    await this.projectMemberDomain.removeByWorkspaceAndUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    );
                    await this.workspaceJoinRequestDomain.cancelPendingByUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    );
                    await this.userDomain.clearLastWorkspaceInTx(
                        tx,
                        removed.userId,
                        workspaceId
                    );

                    return removed;
                }
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async getMembersListByAdmin(
        workspaceId: string,
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                { availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersListByAdmin(
                workspaceId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
