import { subject } from '@casl/ability';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteHttpService {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private async assertInviteCan(
        action: EnumPolicyAction,
        workspaceId: string,
        workspaceInviteId: string
    ): Promise<void> {
        const invite = await this.workspaceInviteDomain.getInvite(
            workspaceId,
            workspaceInviteId
        );
        this.policyAbilityDomain.assertCan(
            action,
            subject(EnumPolicySubject.WorkspaceInvite, invite)
        );
    }

    async getInvitesList(
        workspaceId: string,
        query: WorkspaceInviteListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.WorkspaceInvite
        );
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceInviteWhereInput>(
                query,
                {
                    availableSearch: WorkspaceInviteDefaultAvailableSearch,
                    availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationQueryUtil.inEnum(
            Prisma.WorkspaceInviteScalarFieldEnum.status,
            query.status,
            WorkspaceInviteDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceInviteDomain.getInvitesList(
                workspaceId,
                params,
                status?.where,
                accessibleWhere
            );

        return {
            data,
            ...others,
        };
    }

    async createInvite(
        workspace: Workspace,
        actorId: string,
        {
            email,
            workspaceRoleId,
            projectId,
            projectRoleId,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.create,
            subject(EnumPolicySubject.WorkspaceInvite, {
                workspaceId: workspace.id,
            })
        );
        const invite = await this.workspaceInviteDomain.createInvite(
            workspace,
            actorId,
            { email, workspaceRoleId, projectId, projectRoleId, expiryDuration }
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        await this.assertInviteCan(
            EnumPolicyAction.update,
            workspace.id,
            workspaceInviteId
        );
        const invite = await this.workspaceInviteDomain.resendInvite(
            workspace,
            actorId,
            workspaceInviteId,
            expiryDuration
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void> {
        await this.assertInviteCan(
            EnumPolicyAction.delete,
            workspaceId,
            workspaceInviteId
        );
        await this.workspaceInviteDomain.revokeInvite(
            workspaceId,
            actorId,
            workspaceInviteId
        );
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        { inviteToken }: WorkspaceInviteClaimRequestDto
    ): Promise<void> {
        await this.workspaceInviteDomain.claimInvite(
            userId,
            userEmail,
            inviteToken
        );
    }

    async previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        const { workspace, invite, inviter } =
            await this.workspaceInviteDomain.previewInvite(inviteToken);

        const preview = this.workspaceUtil.mapInvitePreview(
            workspace,
            invite,
            inviter
        );

        return { data: preview };
    }
}
