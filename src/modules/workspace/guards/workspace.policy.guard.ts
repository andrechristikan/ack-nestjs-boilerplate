import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import type {
    EnumPolicyAction,
    Prisma,
    Workspace,
} from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyWorkspaceSubject } from '@modules/policy/enums/policy.enum';
import { PolicyTargetGuard } from '@modules/policy/guards/policy.target.guard';
import type {
    PolicyAbility,
    PolicyTargetResolverRegistry,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    WorkspaceMemberTargetStoreKey,
    WorkspaceStoreKey,
    WorkspaceTargetStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the policies `@WorkspacePolicyProtected` declares against the platform and workspace
 * abilities composed. `Workspace` is judged as the workspace `WorkspaceGuard` stored;
 * `WorkspaceMember` is judged as the `:workspaceMemberId` record, loaded through the policy
 * predicate so a record the ability does not reach answers not-found, when the route carries the
 * param. Every other subject, and a route with no param, is a type-only check. Judged records are
 * stored for `@WorkspaceTargetCurrent()` / `@WorkspaceMemberTargetCurrent()`.
 */
@Injectable()
export class WorkspacePolicyGuard extends PolicyTargetGuard<EnumPolicyWorkspaceSubject> {
    protected readonly resolvers: PolicyTargetResolverRegistry<EnumPolicyWorkspaceSubject> =
        {
            [EnumPolicyWorkspaceSubject.Workspace]: {
                storeKey: WorkspaceTargetStoreKey,
                resolve: async () => this.resolveWorkspace(),
            },
            [EnumPolicyWorkspaceSubject.WorkspaceMember]: {
                storeKey: WorkspaceMemberTargetStoreKey,
                resolve: async (request, ability, action) =>
                    this.resolveWorkspaceMember(request, ability, action),
            },
        };

    constructor(
        reflector: Reflector,
        policyDomain: PolicyDomain,
        policyUtil: PolicyUtil,
        requestStoreService: RequestStoreService,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super(reflector, policyDomain, policyUtil, requestStoreService);
    }

    private async resolveWorkspace(): Promise<Workspace> {
        return this.policyDomain.requireStored<Workspace>(WorkspaceStoreKey);
    }

    private async resolveWorkspaceMember(
        request: IRequestApp,
        ability: PolicyAbility,
        action: EnumPolicyAction
    ): Promise<IWorkspaceMemberWithRole | null> {
        const targetId = request.params.workspaceMemberId;
        if (!targetId) {
            return null;
        }

        const isValid = this.databaseUtil.checkIdIsValid(targetId);
        if (!isValid) {
            throw new WorkspaceMemberNotFoundException();
        }

        const workspace =
            this.policyDomain.requireStored<Workspace>(WorkspaceStoreKey);
        const where =
            this.policyDomain.requireAccessibleWhere<Prisma.WorkspaceMemberWhereInput>(
                ability,
                action,
                EnumPolicySubject.WorkspaceMember
            );

        return this.workspaceMemberDomain.getOneByIdAndWorkspace(
            workspace.id,
            targetId,
            where
        );
    }
}
