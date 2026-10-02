import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subject } from '@casl/ability';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberHttpService {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async transferOwnership(
        workspace: Workspace,
        actorMember: IWorkspaceMemberWithRole,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<void> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Workspace, workspace)
        );
        await this.workspaceMemberDomain.transferOwnership(
            workspace.id,
            actorMember,
            targetUserId
        );
    }

    async leaveWorkspace(
        workspaceId: string,
        member: IWorkspaceMemberWithRole
    ): Promise<void> {
        await this.workspaceMemberDomain.leaveWorkspace(workspaceId, member);
    }

    async getMembersList(
        workspaceId: string,
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        const accessibleWhere =
            this.policyAbilityDomain.requireAccessibleWhere<Prisma.WorkspaceMemberWhereInput>(
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            );

        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceMemberWhereInput>(
                query,
                {
                    availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                }
            );
        const role = this.paginationQueryUtil.inEnum(
            'role',
            query.role,
            WorkspaceMemberDefaultRole
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(role?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersList(
                workspaceId,
                params,
                role?.where,
                accessibleWhere
            );

        return {
            data,
            ...others,
        };
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
        targetMemberId: string,
        { roleId }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void> {
        const targetMember =
            await this.workspaceMemberDomain.getOneByIdAndWorkspace(
                workspaceId,
                targetMemberId
            );
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.WorkspaceMember, targetMember)
        );
        await this.workspaceMemberDomain.updateMemberRole(
            workspaceId,
            actorMember,
            targetMember,
            roleId
        );
    }

    async removeMember(
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
        targetMemberId: string
    ): Promise<void> {
        const targetMember =
            await this.workspaceMemberDomain.getOneByIdAndWorkspace(
                workspaceId,
                targetMemberId
            );
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.WorkspaceMember, targetMember)
        );
        await this.workspaceMemberDomain.removeMember(
            workspaceId,
            actorMember,
            targetMember
        );
    }

    async getMembersListForAdmin(
        workspaceId: string,
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                {
                    availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersListForAdmin(
                workspaceId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
