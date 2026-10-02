import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project, Workspace } from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyPlatformSubject } from '@modules/policy/enums/policy.enum';
import { PolicyTargetGuard } from '@modules/policy/guards/policy.target.guard';
import type { PolicyTargetResolverRegistry } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { ProjectTargetStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { WorkspaceTargetStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the policies `@PlatformPolicyProtected` declares against the platform ability. A
 * `Workspace` or `Project` subject whose route carries `:workspaceId` / `:projectId` is resolved
 * from the param (soft-deleted included, never from the header), judged as a tagged record and
 * stored for `@WorkspaceTargetCurrent()` / `@ProjectTargetCurrent()`; every other subject is a
 * type-only check. It validates the param itself because guards run before the validation pipe.
 */
@Injectable()
export class PlatformPolicyGuard extends PolicyTargetGuard<EnumPolicyPlatformSubject> {
    protected readonly resolvers: PolicyTargetResolverRegistry<EnumPolicyPlatformSubject> =
        {
            [EnumPolicyPlatformSubject.Workspace]: {
                storeKey: WorkspaceTargetStoreKey,
                resolve: async request => this.resolveWorkspace(request),
            },
            [EnumPolicyPlatformSubject.Project]: {
                storeKey: ProjectTargetStoreKey,
                resolve: async request => this.resolveProject(request),
            },
        };

    constructor(
        reflector: Reflector,
        policyDomain: PolicyDomain,
        policyUtil: PolicyUtil,
        requestStoreService: RequestStoreService,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super(reflector, policyDomain, policyUtil, requestStoreService);
    }

    private async resolveWorkspace(
        request: IRequestApp
    ): Promise<Workspace | null> {
        const workspaceId = request.params.workspaceId;
        if (!workspaceId) {
            return null;
        }

        const isValid = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValid) {
            throw new WorkspaceNotFoundException();
        }

        return this.workspaceDomain.getByIdForAdmin(workspaceId);
    }

    private async resolveProject(request: IRequestApp): Promise<Project | null> {
        const projectId = request.params.projectId;
        if (!projectId) {
            return null;
        }

        const isValid = this.databaseUtil.checkIdIsValid(projectId);
        if (!isValid) {
            throw new ProjectNotFoundException();
        }

        return this.projectDomain.getByIdForAdmin(projectId);
    }
}
