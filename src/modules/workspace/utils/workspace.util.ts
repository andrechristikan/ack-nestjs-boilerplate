import type { Workspace } from '@generated/prisma-client/client';
import type {
    IWorkspaceInviteInviter,
    IWorkspaceInvitePreviewSummary,
    IWorkspaceInviteWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import type { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
    mapInvite(invite: IWorkspaceInviteWithRole): WorkspaceInviteResponseDto {
        return {
            id: invite.id,
            workspaceId: invite.workspaceId,
            email: invite.email,
            workspaceRole: invite.workspaceRole,
            projectId: invite.projectId,
            projectRole: invite.projectRole,
            reference: invite.reference,
            expiredAt: invite.expiredAt,
            status: invite.status,
            invitedByUserId: invite.invitedByUserId,
            acceptedAt: invite.acceptedAt,
            acceptedByUserId: invite.acceptedByUserId,
            createdAt: invite.createdAt,
            createdBy: invite.createdBy,
            updatedAt: invite.updatedAt,
            updatedBy: invite.updatedBy,
        };
    }

    mapInvitePreview(
        workspace: Workspace,
        invite: IWorkspaceInviteWithRole,
        inviter: IWorkspaceInviteInviter | null
    ): IWorkspaceInvitePreviewSummary {
        return {
            workspaceName: workspace.name,
            inviterName: inviter?.name ?? inviter?.username ?? workspace.name,
            workspaceRole: invite.workspaceRole,
            expiredAt: invite.expiredAt,
        };
    }
}
