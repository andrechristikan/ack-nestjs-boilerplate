import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';

@Injectable()
export class ProjectMemberHttpService {
    constructor(
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly projectUtil: ProjectUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    async getMembersList(
        project: Project,
        query: ProjectMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectMemberWhereInput>(
                query,
                { availableOrderBy: ProjectMemberDefaultAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectMemberDomain.getMembersList(project, params);

        return {
            data,
            ...others,
        };
    }

    async assignMember(
        project: Project,
        actorMember: WorkspaceMember,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: userId },
            }),
        ];
        if (userId !== actorId) {
            const assignedByAdminActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            });
            activityLogs.push(assignedByAdminActivityLog);
        }

        const targetMember =
            await this.workspaceMemberDomain.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            );
        const member = await this.projectMemberDomain.assignMember(
            project,
            actor,
            targetMember,
            role
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: member };
    }

    async updateMemberRole(
        project: Project,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        { role }: ProjectMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const targetMember = await this.projectMemberDomain.updateMemberRole(
            project,
            actor,
            targetMemberId,
            role
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorId) {
            const roleUpdatedByAdminActivityLog =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                });
            activityLogs.push(roleUpdatedByAdminActivityLog);
        }

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async removeMember(
        project: Project,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const targetMember = await this.projectMemberDomain.removeMember(
            project,
            actor,
            targetMemberId
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            }),
        ];

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async leaveProject(
        project: Project,
        member: ProjectMember
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId: project.workspaceId,
            }),
        ];

        await this.projectMemberDomain.leaveProject(member);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
