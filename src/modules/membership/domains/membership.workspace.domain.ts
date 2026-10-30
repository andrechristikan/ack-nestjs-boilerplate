import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipWorkspaceDomain {
    constructor(
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    /** Soft deletes the workspace with its projects and closes its pending invites and join requests on one transaction. */
    async softDelete(workspaceId: string, actorId: string): Promise<void> {
        const deletedAt = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceDomain.softDeleteInTx(
                tx,
                workspaceId,
                deletedAt
            );
            await this.projectDomain.softDeleteByWorkspaceInTx(
                tx,
                workspaceId,
                deletedAt,
                actorId
            );
            await this.workspaceInviteDomain.expirePendingByWorkspaceInTx(
                tx,
                workspaceId
            );
            await this.workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx(
                tx,
                workspaceId
            );
        });
    }
}
