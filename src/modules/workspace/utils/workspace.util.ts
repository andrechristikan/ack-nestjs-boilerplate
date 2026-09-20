import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import type {
    IWorkspaceInviteInviter,
    IWorkspaceInvitePreviewSummary,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
    mapInvitePreview(
        workspace: Workspace,
        invite: WorkspaceInvite,
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
