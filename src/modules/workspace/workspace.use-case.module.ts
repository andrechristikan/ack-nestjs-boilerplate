import { NotificationModule } from '@modules/notification/notification.module';
import { ProjectModule } from '@modules/project/project.module';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceGetListCursorByMemberUseCase } from '@modules/workspace/use-cases/workspace.get-list-cursor-by-member.use-case';
import { WorkspaceCreateUseCase } from '@modules/workspace/use-cases/workspace.create.use-case';
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';
import { WorkspaceUpdateUseCase } from '@modules/workspace/use-cases/workspace.update.use-case';
import { WorkspaceUpdateIsPublicUseCase } from '@modules/workspace/use-cases/workspace.update-is-public.use-case';
import { WorkspaceUpdateSlugUseCase } from '@modules/workspace/use-cases/workspace.update-slug.use-case';
import { WorkspaceSwitchUseCase } from '@modules/workspace/use-cases/workspace.switch.use-case';
import { WorkspaceSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.soft-delete.use-case';
import { WorkspaceGetListOffsetByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-list-offset-by-admin.use-case';
import { WorkspaceGetByIdByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-by-id-by-admin.use-case';
import { WorkspacePreviewUseCase } from '@modules/workspace/use-cases/workspace.preview.use-case';
import { WorkspaceGetInvitesListUseCase } from '@modules/workspace/use-cases/workspace.get-invites-list.use-case';
import { WorkspaceCreateInviteUseCase } from '@modules/workspace/use-cases/workspace.create-invite.use-case';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';
import { WorkspaceRevokeInviteUseCase } from '@modules/workspace/use-cases/workspace.revoke-invite.use-case';
import { WorkspaceClaimInviteUseCase } from '@modules/workspace/use-cases/workspace.claim-invite.use-case';
import { WorkspacePreviewInviteUseCase } from '@modules/workspace/use-cases/workspace.preview-invite.use-case';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';
import { WorkspaceGetJoinRequestsListUseCase } from '@modules/workspace/use-cases/workspace.get-join-requests-list.use-case';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';
import { WorkspaceRejectJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.reject-join-request.use-case';
import { WorkspaceTransferOwnershipUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership.use-case';
import { WorkspaceLeaveUseCase } from '@modules/workspace/use-cases/workspace.leave.use-case';
import { WorkspaceGetMembersListUseCase } from '@modules/workspace/use-cases/workspace.get-members-list.use-case';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';
import { WorkspaceRemoveMemberUseCase } from '@modules/workspace/use-cases/workspace.remove-member.use-case';
import { WorkspaceGetMembersListByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-members-list-by-admin.use-case';
import { WorkspaceProcessExpireStaleInvitesUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case';
import { WorkspaceProcessExpireStaleJoinRequestsUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-join-requests.use-case';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        WorkspaceGetListCursorByMemberUseCase,
        WorkspaceCreateUseCase,
        WorkspaceGetCurrentUseCase,
        WorkspaceUpdateUseCase,
        WorkspaceUpdateIsPublicUseCase,
        WorkspaceUpdateSlugUseCase,
        WorkspaceSwitchUseCase,
        WorkspaceSoftDeleteUseCase,
        WorkspaceGetListOffsetByAdminUseCase,
        WorkspaceGetByIdByAdminUseCase,
        WorkspacePreviewUseCase,
        WorkspaceGetInvitesListUseCase,
        WorkspaceCreateInviteUseCase,
        WorkspaceResendInviteUseCase,
        WorkspaceRevokeInviteUseCase,
        WorkspaceClaimInviteUseCase,
        WorkspacePreviewInviteUseCase,
        WorkspaceCreateJoinRequestUseCase,
        WorkspaceGetJoinRequestsListUseCase,
        WorkspaceAcceptJoinRequestUseCase,
        WorkspaceRejectJoinRequestUseCase,
        WorkspaceTransferOwnershipUseCase,
        WorkspaceLeaveUseCase,
        WorkspaceGetMembersListUseCase,
        WorkspaceUpdateMemberRoleUseCase,
        WorkspaceRemoveMemberUseCase,
        WorkspaceGetMembersListByAdminUseCase,
        WorkspaceProcessExpireStaleInvitesUseCase,
        WorkspaceProcessExpireStaleJoinRequestsUseCase,
        WorkspaceProcessor,
    ],
    exports: [
        WorkspaceGetListCursorByMemberUseCase,
        WorkspaceCreateUseCase,
        WorkspaceGetCurrentUseCase,
        WorkspaceUpdateUseCase,
        WorkspaceUpdateIsPublicUseCase,
        WorkspaceUpdateSlugUseCase,
        WorkspaceSwitchUseCase,
        WorkspaceSoftDeleteUseCase,
        WorkspaceGetListOffsetByAdminUseCase,
        WorkspaceGetByIdByAdminUseCase,
        WorkspacePreviewUseCase,
        WorkspaceGetInvitesListUseCase,
        WorkspaceCreateInviteUseCase,
        WorkspaceResendInviteUseCase,
        WorkspaceRevokeInviteUseCase,
        WorkspaceClaimInviteUseCase,
        WorkspacePreviewInviteUseCase,
        WorkspaceCreateJoinRequestUseCase,
        WorkspaceGetJoinRequestsListUseCase,
        WorkspaceAcceptJoinRequestUseCase,
        WorkspaceRejectJoinRequestUseCase,
        WorkspaceTransferOwnershipUseCase,
        WorkspaceLeaveUseCase,
        WorkspaceGetMembersListUseCase,
        WorkspaceUpdateMemberRoleUseCase,
        WorkspaceRemoveMemberUseCase,
        WorkspaceGetMembersListByAdminUseCase,
        WorkspaceProcessExpireStaleInvitesUseCase,
        WorkspaceProcessExpireStaleJoinRequestsUseCase,
    ],
    imports: [ProjectModule, UserModule, WorkspaceModule, NotificationModule],
})
export class WorkspaceUseCaseModule {}
