import { subject } from '@casl/ability';
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
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceSoftDeleteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IPolicyContext,
    ],
    IResponseReturn<void>
> {
    private readonly timeoutInMs: number;

    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectService: ProjectService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {
        this.timeoutInMs = this.configService.get<number>(
            'workspace.delete.timeoutInMs'
        )!;
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<void>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Workspace, workspaceContext.workspace)
        );
        const workspaceId = workspaceContext.workspace.id;
        const actorId = authContext.userId;
        const deletedAt = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(
                async tx => {
                    await this.workspaceService.softDeleteInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.projectService.softDeleteByWorkspaceInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.workspaceInviteService.revokePendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    await this.workspaceJoinRequestService.cancelPendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    const entry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        workspaceContext,
                        {
                            action: EnumActivityLogAction.workspaceDeleted,
                            userId: actorId,
                            createdBy: actorId,
                            workspaceId,
                        }
                    );
                    await this.outboxService.addInTx(tx, entry);
                },
                { timeout: this.timeoutInMs }
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

        return {};
    }
}
