import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Workspace, WorkspaceInvite } from '@generated/prisma-client';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import {
    IWorkspaceInviteCreate,
    IWorkspaceInvitePreview,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceInviteService {
    validateInviteToken(token: string): Promise<WorkspaceInvite>;
    expireStalePending(): Promise<number>;
    getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInvite>>;
    createInvite(
        workspace: Workspace,
        actorId: string,
        create: IWorkspaceInviteCreate
    ): Promise<WorkspaceInvite>;
    resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        expiryDuration?: EnumWorkspaceInviteExpiry
    ): Promise<WorkspaceInvite>;
    revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void>;
    claimInvite(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<void>;
    previewInvite(inviteToken: string): Promise<IWorkspaceInvitePreview>;
}
