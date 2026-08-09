import { ResponseUtil } from '@common/response/utils/response.util';
import {
    Workspace,
    WorkspaceInvite,
    WorkspaceJoinRequest,
} from '@generated/prisma-client';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import {
    IWorkspaceInviteInviter,
    IWorkspaceMember,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

    mapOne(workspace: Workspace): WorkspaceResponseDto {
        return this.responseUtil.serialize(WorkspaceResponseDto, workspace);
    }

    mapList(workspaces: Workspace[]): WorkspaceResponseDto[] {
        return this.responseUtil.serialize(WorkspaceResponseDto, workspaces);
    }

    mapPreview(workspace: Workspace): WorkspacePreviewResponseDto {
        return this.responseUtil.serialize(
            WorkspacePreviewResponseDto,
            workspace
        );
    }

    mapMemberList(
        members: IWorkspaceMember[]
    ): WorkspaceMemberResponseDto[] {
        return this.responseUtil.serialize(
            WorkspaceMemberResponseDto,
            members
        );
    }

    mapInvite(invite: WorkspaceInvite): WorkspaceInviteResponseDto {
        return this.responseUtil.serialize(
            WorkspaceInviteResponseDto,
            invite
        );
    }

    mapInviteList(invites: WorkspaceInvite[]): WorkspaceInviteResponseDto[] {
        return this.responseUtil.serialize(
            WorkspaceInviteResponseDto,
            invites
        );
    }

    mapInvitePreview(
        workspace: Workspace,
        invite: WorkspaceInvite,
        inviter: IWorkspaceInviteInviter | null
    ): WorkspaceInvitePreviewResponseDto {
        return this.responseUtil.serialize(WorkspaceInvitePreviewResponseDto, {
            workspaceName: workspace.name,
            inviterName: inviter?.name ?? inviter?.username ?? workspace.name,
            workspaceRole: invite.workspaceRole,
            expiredAt: invite.expiredAt,
        });
    }

    mapJoinRequest(
        joinRequest: WorkspaceJoinRequest
    ): WorkspaceJoinRequestResponseDto {
        return this.responseUtil.serialize(
            WorkspaceJoinRequestResponseDto,
            joinRequest
        );
    }

    mapJoinRequestList(
        joinRequests: WorkspaceJoinRequest[]
    ): WorkspaceJoinRequestResponseDto[] {
        return this.responseUtil.serialize(
            WorkspaceJoinRequestResponseDto,
            joinRequests
        );
    }
}
