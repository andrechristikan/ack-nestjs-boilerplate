import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceRemoveMemberUseCase implements IAppUseCase<
    [string, WorkspaceMember, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogService: ActivityLogService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        let targetMember: WorkspaceMember;
        try {
            targetMember = await this.databaseService.withTransaction(
                async tx => {
                    const removed =
                        await this.workspaceMemberService.removeMemberInTx(
                            tx,
                            workspaceId,
                            actorMember,
                            targetMemberId
                        );
                    await this.projectMemberService.removeByWorkspaceAndUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    );
                    const email = await this.userService.getEmailByIdInTx(
                        tx,
                        removed.userId
                    );
                    if (email !== null) {
                        await this.workspaceInviteService.revokePendingByEmailInTx(
                            tx,
                            workspaceId,
                            email
                        );
                    }
                    await this.workspaceJoinRequestService.cancelPendingByUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    );
                    await this.userService.clearLastWorkspaceInTx(
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
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
