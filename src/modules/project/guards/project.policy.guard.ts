import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import type {
    EnumPolicyAction,
    Prisma,
    Project,
} from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyProjectSubject } from '@modules/policy/enums/policy.enum';
import { PolicyTargetGuard } from '@modules/policy/guards/policy.target.guard';
import type {
    PolicyAbility,
    PolicyTargetResolverRegistry,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    ProjectMemberTargetStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the policies `@ProjectPolicyProtected` declares against the platform, workspace and
 * project abilities composed. `Project` is judged as the record `ProjectGuard` stored (workspace-bound
 * and active). `ProjectMember` is judged as the `:projectMemberId` record, loaded through the policy
 * predicate so a record the ability does not reach answers not-found, and stored for
 * `@ProjectMemberTargetCurrent()`; a route with no param (assign) is a type-only check.
 */
@Injectable()
export class ProjectPolicyGuard extends PolicyTargetGuard<EnumPolicyProjectSubject> {
    protected readonly resolvers: PolicyTargetResolverRegistry<EnumPolicyProjectSubject> =
        {
            [EnumPolicyProjectSubject.Project]: {
                storeKey: null,
                resolve: async () => this.resolveProject(),
            },
            [EnumPolicyProjectSubject.ProjectMember]: {
                storeKey: ProjectMemberTargetStoreKey,
                resolve: async (request, ability, action) =>
                    this.resolveProjectMember(request, ability, action),
            },
        };

    constructor(
        reflector: Reflector,
        policyDomain: PolicyDomain,
        policyUtil: PolicyUtil,
        requestStoreService: RequestStoreService,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super(reflector, policyDomain, policyUtil, requestStoreService);
    }

    private async resolveProject(): Promise<Project> {
        return this.policyDomain.requireStored<Project>(ProjectStoreKey);
    }

    private async resolveProjectMember(
        request: IRequestApp,
        ability: PolicyAbility,
        action: EnumPolicyAction
    ): Promise<IProjectMemberWithRole | null> {
        const targetId = request.params.projectMemberId;
        if (!targetId) {
            return null;
        }

        const isValid = this.databaseUtil.checkIdIsValid(targetId);
        if (!isValid) {
            throw new ProjectMemberNotFoundException();
        }

        const project =
            this.policyDomain.requireStored<Project>(ProjectStoreKey);
        const where =
            this.policyDomain.requireAccessibleWhere<Prisma.ProjectMemberWhereInput>(
                ability,
                action,
                EnumPolicySubject.ProjectMember
            );

        return this.projectMemberDomain.getOneByIdAndProject(
            project.id,
            targetId,
            where
        );
    }
}
