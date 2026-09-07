import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Workspace, WorkspaceInvite } from '@generated/prisma-client';
import {
    IWorkspaceInviteInviter,
    IWorkspaceInvitePreviewSummary,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    getCurrentRequestLog(): IRequestLog {
        return this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
    }

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
