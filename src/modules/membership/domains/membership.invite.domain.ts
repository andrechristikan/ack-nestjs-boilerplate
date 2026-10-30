import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipInviteDomain {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly userDomain: UserDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    /** Accepts the pending invite of a token for a signed-in user: workspace membership, invite acceptance, last workspace, and the optional project membership on one transaction. */
    async claim(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<WorkspaceInvite> {
        const invite = await this.workspaceInviteDomain.validateInviteForEmail(
            inviteToken,
            userEmail
        );

        const existingMember =
            await this.workspaceMemberDomain.getOneByWorkspaceAndUser(
                invite.workspaceId,
                userId
            );
        if (existingMember) {
            throw new WorkspaceInviteInvalidException();
        }

        const acceptedAt = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceMemberDomain.createInTx(
                tx,
                invite.workspaceId,
                userId,
                invite.workspaceRole,
                userId
            );
            await this.workspaceInviteDomain.acceptPendingInTx(
                tx,
                invite.id,
                userId,
                acceptedAt
            );
            await this.userDomain.setLastWorkspaceInTx(
                tx,
                userId,
                invite.workspaceId
            );
            if (invite.projectId && invite.projectRole) {
                await this.projectMemberDomain.createInTx(
                    tx,
                    invite.projectId,
                    userId,
                    invite.projectRole,
                    userId
                );
            }
        });

        return invite;
    }
}
