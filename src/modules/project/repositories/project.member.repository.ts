import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    Prisma,
    ProjectMember,
} from '@generated/prisma-client';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { WorkspaceActivityLogUtil } from '@modules/workspace/utils/workspace.activity-log.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly workspaceActivityLogUtil: WorkspaceActivityLogUtil
    ) {}

    async findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                projectId,
                userId,
            },
        });
    }

    async findByIdAndProject(
        projectMemberId: string,
        projectId: string
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                id: projectMemberId,
                projectId,
            },
        });
    }

    async findWithPaginationCursor(
        projectId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.cursor<
            IProjectMember,
            Prisma.ProjectMemberWhereInput
        >(this.databaseService.client.projectMember, {
            ...others,
            where: {
                ...where,
                projectId,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async createAssigned(
        projectId: string,
        workspaceId: string,
        actorId: string,
        userId: string,
        role: EnumProjectMemberRole,
        requestLog: IRequestLog
    ): Promise<IProjectMember> {
        const [member] = await this.databaseService.client.$transaction([
            this.databaseService.client.projectMember.create({
                data: {
                    projectId,
                    userId,
                    role,
                    createdBy: actorId,
                },
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectMemberAssigned,
                    requestLog
                )
            ),
        ]);

        return member;
    }

    async updateRole(
        workspaceId: string,
        actorId: string,
        targetMemberId: string,
        newRole: EnumProjectMemberRole,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.projectMember.update({
                where: { id: targetMemberId },
                data: {
                    role: newRole,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectMemberRoleUpdated,
                    requestLog
                )
            ),
        ]);
    }

    async removeMember(
        workspaceId: string,
        actorId: string,
        targetMemberId: string,
        action:
            | typeof EnumActivityLogAction.projectMemberRemoved
            | typeof EnumActivityLogAction.projectMemberLeft,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.projectMember.delete({
                where: { id: targetMemberId },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    action,
                    requestLog
                )
            ),
        ]);
    }
}
