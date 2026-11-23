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
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectSoftDeleteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IProjectContext,
        IPolicyContext,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        projectContext: IProjectContext,
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<void>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Project, projectContext.project)
        );
        const project = projectContext.project;
        const actorId = authContext.userId;
        const deletedAt = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.projectService.softDeleteProjectInTx(
                    tx,
                    project,
                    deletedAt,
                    actorId
                );
                await this.workspaceInviteService.clearProjectInTx(
                    tx,
                    project.id
                );
                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.projectDeleted,
                        userId: actorId,
                        createdBy: actorId,
                        workspaceId: project.workspaceId,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ProjectNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
