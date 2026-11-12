import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceClaimInviteUseCase implements IAppUseCase<
    [string, string, WorkspaceInviteClaimRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly userService: UserService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        userEmail: string,
        { inviteToken }: WorkspaceInviteClaimRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        const invite = await this.workspaceInviteService.validateInviteForEmail(
            inviteToken,
            userEmail
        );

        const acceptedAt = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.workspaceInviteService.acceptPendingInTx(
                    tx,
                    invite.id,
                    userId,
                    acceptedAt
                );
                await this.workspaceMemberService.createInTx(
                    tx,
                    invite.workspaceId,
                    userId,
                    invite.workspaceRole,
                    userId
                );
                await this.userService.setLastWorkspaceInTx(
                    tx,
                    userId,
                    invite.workspaceId
                );
                if (invite.projectId && invite.projectRole) {
                    await this.projectMemberService.createInTx(
                        tx,
                        invite.projectId,
                        userId,
                        invite.projectRole,
                        userId
                    );
                }
                const inviteeEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.workspaceInviteAccepted,
                        userId,
                        createdBy: userId,
                        workspaceId: invite.workspaceId,
                        metadata: { targetUserId: invite.invitedByUserId },
                    },
                    context
                );
                const entries = [inviteeEntry];
                if (invite.invitedByUserId !== userId) {
                    const inviterEntry = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                            userId: invite.invitedByUserId,
                            createdBy: userId,
                            workspaceId: invite.workspaceId,
                            metadata: { actorUserId: userId },
                        },
                        context
                    );
                    entries.push(inviterEntry);
                }
                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isAlreadyMember = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isAlreadyMember) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
