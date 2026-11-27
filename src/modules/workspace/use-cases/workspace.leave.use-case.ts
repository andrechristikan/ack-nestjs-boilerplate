import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceLeaveUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IWorkspaceContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly projectMemberService: ProjectMemberService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<void>> {
        const member = workspaceContext.workspaceMember;
        this.workspaceMemberService.assertLeavable(member);

        await this.databaseService.withTransaction(async tx => {
            // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
            const left = await this.workspaceMemberService.leaveWorkspaceInTx(
                tx,
                member
            );
            await Promise.all([
                this.projectMemberService.removeByWorkspaceAndUserInTx(
                    tx,
                    left.workspaceId,
                    left.userId
                ),
                this.userService.clearLastWorkspaceInTx(
                    tx,
                    left.userId,
                    left.workspaceId
                ),
            ]);
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceMemberLeft,
                    userId: left.userId,
                    createdBy: left.userId,
                    workspaceId: left.workspaceId,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
