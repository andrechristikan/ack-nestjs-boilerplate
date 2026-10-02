import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import type {
    IEffectivePermission,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import { WorkspacePermissionSubjects } from '@modules/workspace/constants/workspace.constant';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceHttpService {
    constructor(
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListForMember(
        userId: string,
        query: WorkspaceUserListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceWhereInput>(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.workspaceDomain.getListForMember(
            userId,
            params
        );

        return {
            data,
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.createWorkspace(userId, {
            name,
            description,
            isPublic,
        });

        return { data: workspace };
    }

    getCurrentWorkspace(workspace: Workspace): IResponseReturn<Workspace> {
        const current = this.workspaceDomain.getCurrentWorkspace(workspace);

        return { data: current };
    }

    async updateWorkspace(
        workspaceTarget: Workspace,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Workspace, workspaceTarget)
        );
        const workspace = await this.workspaceDomain.updateWorkspace(
            workspaceTarget.id,
            actorId,
            { name, description }
        );

        return { data: workspace };
    }

    async updateWorkspaceIsPublic(
        workspaceTarget: Workspace,
        actorId: string,
        { isPublic }: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Workspace, workspaceTarget)
        );
        const workspace = await this.workspaceDomain.updateWorkspaceIsPublic(
            workspaceTarget.id,
            actorId,
            isPublic
        );

        return { data: workspace };
    }

    async updateWorkspaceSlug(
        workspaceTarget: Workspace,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Workspace, workspaceTarget)
        );
        const workspace = await this.workspaceDomain.updateWorkspaceSlug(
            workspaceTarget.id,
            actorId,
            slug
        );

        return { data: workspace };
    }

    async switchWorkspace(
        userId: string,
        { workspaceId }: WorkspaceSwitchRequestDto
    ): Promise<void> {
        await this.workspaceDomain.switchWorkspace(userId, workspaceId);
    }

    async softDeleteWorkspace(
        workspaceTarget: Workspace,
        actorId: string
    ): Promise<void> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Workspace, workspaceTarget)
        );
        await this.workspaceDomain.softDeleteWorkspace(
            workspaceTarget.id,
            actorId
        );
    }

    async getListForAdmin(
        query: WorkspaceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        const accessibleWhere =
            this.policyAbilityDomain.requireAccessibleWhere<Prisma.WorkspaceWhereInput>(
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.Workspace
            );

        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceWhereInput>(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
        const isPublic = this.paginationQueryUtil.equalBoolean(
            Prisma.WorkspaceScalarFieldEnum.isPublic,
            query.isPublic
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isPublic?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.workspaceDomain.getListForAdmin(
            params,
            isPublic?.where,
            accessibleWhere
        );

        return {
            data,
            ...others,
        };
    }

    async getForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        const workspace =
            await this.workspaceDomain.getByIdForAdmin(workspaceId);
        return { data: workspace };
    }

    async previewWorkspace(slug: string): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.previewWorkspace(slug);

        return { data: workspace };
    }

    getEffectivePermissions(): IResponseReturn<{
        permissions: IEffectivePermission[];
    }> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );

        const permissions = this.policyAbilityDomain.getEffectivePermissions(
            ability,
            WorkspacePermissionSubjects
        );

        return { data: { permissions } };
    }
}
