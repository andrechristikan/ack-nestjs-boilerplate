import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceRemoveMemberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IPolicyContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogService: ActivityLogService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        const workspaceId = workspaceContext.workspace.id;
        const actorMember = workspaceContext.workspaceMember;
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.delete,
            EnumPolicySubject.WorkspaceMember
        );
        try {
            await this.outboxService.withTransaction(async tx => {
                const removed =
                    await this.workspaceMemberService.removeMemberInTx(
                        tx,
                        workspaceId,
                        actorMember,
                        targetMemberId,
                        additionalWhere
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
                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.workspaceMemberRemoved,
                        userId: actorMember.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { targetUserId: removed.userId },
                    }
                );
                const targetEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                        userId: removed.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { actorUserId: actorMember.userId },
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    actorEntry,
                    targetEntry,
                ]);
            });
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

        return {};
    }
}
