import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceLeaveUseCase implements IAppUseCase<
    [string, WorkspaceMember, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogService: ActivityLogService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly userService: UserService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        workspaceId: string,
        member: WorkspaceMember,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.workspaceMemberService.leaveWorkspaceInTx(
                    tx,
                    member
                );
                await this.projectMemberService.removeByWorkspaceAndUserInTx(
                    tx,
                    workspaceId,
                    member.userId
                );
                await this.workspaceJoinRequestService.cancelPendingByUserInTx(
                    tx,
                    workspaceId,
                    member.userId
                );
                await this.userService.clearLastWorkspaceInTx(
                    tx,
                    member.userId,
                    workspaceId
                );
                const entry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.workspaceMemberLeft,
                        userId: member.userId,
                        createdBy: member.userId,
                        workspaceId,
                    },
                    context
                );
                await this.outboxService.addInTx(tx, entry);
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

        return {};
    }
}
