import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
    Prisma,
    Project,
    User,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

export interface IWorkspaceInviteCreateData {
    workspaceId: string;
    email: string;
    workspaceRole: EnumWorkspaceMemberRole;
    projectId?: string;
    projectRole?: EnumProjectMemberRole;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    invitedByUserId: string;
}

@Injectable()
export class WorkspaceInviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    /** Flips truly-expired `pending` invites to `expired`; returns the count updated. */
    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.create();

        const { count } =
            await this.databaseService.client.workspaceInvite.updateMany({
                where: {
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        lt: today,
                    },
                },
                data: {
                    status: EnumWorkspaceInviteStatus.expired,
                },
            });

        return count;
    }

    /** Finds a pending invite by hashed token, restricted to invites whose workspace is still active, so an invite orphaned before the soft-delete cascade existed cannot be claimed. */
    async findPendingByHashedToken(
        hashedToken: string
    ): Promise<WorkspaceInvite | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.workspaceInvite.findFirst({
            where: {
                token: hashedToken,
                status: EnumWorkspaceInviteStatus.pending,
                expiredAt: {
                    gt: today,
                },
                workspace: {
                    OR: WorkspaceActiveFilter,
                },
            },
        });
    }

    async findByIdAndWorkspace(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite | null> {
        return this.databaseService.client.workspaceInvite.findFirst({
            where: {
                id: workspaceInviteId,
                workspaceId,
            },
        });
    }

    async existsPendingByWorkspaceAndEmail(
        workspaceId: string,
        email: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.workspaceInvite.count({
            where: {
                workspaceId,
                email,
                status: EnumWorkspaceInviteStatus.pending,
            },
        });

        return count > 0;
    }

    async findActiveUserByEmail(email: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findInviterNameById(
        userId: string
    ): Promise<IWorkspaceInviteInviter | null> {
        return this.databaseService.client.user.findUnique({
            where: { id: userId },
            select: { name: true, username: true },
        });
    }

    async findActiveProjectByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        return this.databaseService.client.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
                OR: ProjectActiveFilter,
            },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<WorkspaceInvite>> {
        return this.paginationService.cursor<
            WorkspaceInvite,
            Prisma.WorkspaceInviteWhereInput
        >(this.databaseService.client.workspaceInvite, {
            ...others,
            where: {
                ...where,
                ...(status ?? {}),
                workspaceId,
            },
        });
    }

    async createPending(
        {
            workspaceId,
            email,
            workspaceRole,
            projectId,
            projectRole,
            hashedToken,
            reference,
            expiredAt,
            invitedByUserId,
        }: IWorkspaceInviteCreateData,
        requestLog: IRequestLog
    ): Promise<WorkspaceInvite> {
        const [invite] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceInvite.create({
                data: {
                    workspaceId,
                    email,
                    workspaceRole,
                    projectId,
                    projectRole,
                    token: hashedToken,
                    reference,
                    expiredAt,
                    invitedByUserId,
                    createdBy: invitedByUserId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    invitedByUserId,
                    workspaceId,
                    EnumActivityLogAction.workspaceInviteCreated,
                    requestLog
                )
            ),
        ]);

        return invite;
    }

    async rotateForResend(
        workspaceInviteId: string,
        actorId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date
    ): Promise<WorkspaceInvite> {
        return this.databaseService.client.workspaceInvite.update({
            where: { id: workspaceInviteId },
            data: {
                token: hashedToken,
                reference,
                expiredAt,
                updatedBy: actorId,
            },
        });
    }

    async revoke(
        workspaceInviteId: string,
        workspaceId: string,
        actorId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceInvite.update({
                where: { id: workspaceInviteId },
                data: {
                    status: EnumWorkspaceInviteStatus.revoked,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceInviteRevoked,
                    requestLog
                )
            ),
        ]);
    }

    /** Accepts an invite for a user who already exists: it creates the membership and settles the invite, and never creates a user row. */
    async acceptForExistingUser(
        userId: string,
        invite: WorkspaceInvite,
        role: EnumWorkspaceMemberRole,
        requestLog: IRequestLog
    ): Promise<WorkspaceMember> {
        const today = this.helperDateService.create();

        return this.databaseService.client.$transaction(async tx => {
            const member = await tx.workspaceMember.create({
                data: {
                    workspaceId: invite.workspaceId,
                    userId,
                    role,
                    createdBy: userId,
                },
            });

            await tx.workspaceInvite.update({
                where: { id: invite.id },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    acceptedAt: today,
                    acceptedByUserId: userId,
                    updatedBy: userId,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    lastWorkspaceId: invite.workspaceId,
                    lastWorkspaceChangedAt: today,
                    updatedBy: userId,
                },
            });

            if (invite.projectId && invite.projectRole) {
                await tx.projectMember.create({
                    data: {
                        projectId: invite.projectId,
                        userId,
                        role: invite.projectRole,
                        createdBy: userId,
                    },
                });
            }

            await tx.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    userId,
                    invite.workspaceId,
                    EnumActivityLogAction.workspaceInviteAccepted,
                    requestLog
                )
            );

            return member;
        });
    }
}
