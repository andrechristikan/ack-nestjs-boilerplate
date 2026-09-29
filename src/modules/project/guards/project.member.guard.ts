import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project, Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IPolicyPlaceholderContext } from '@modules/policy/interfaces/policy.interface';
import type { IUserWithoutPolicies } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Loads the caller's membership of the project resolved by `ProjectGuard`, which must run before
 * this guard, stores the membership with its role (without policies), and merges the role's policies into the resolved request ability. `@ProjectMemberProtected()`
 * (strict, the default) rejects a caller with no `ProjectMember` row;
 * `@ProjectMemberProtected({ required: false })` lets that caller through with the workspace
 * policies alone.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredMeta = this.reflector.get<boolean | undefined>(
            ProjectMemberRequiredMetaKey,
            context.getHandler()
        );
        const required = requiredMeta ?? true;

        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        const workspaceMember = this.requestStoreService.get<
            NonNullable<IPolicyPlaceholderContext['workspaceMember']>
        >(WorkspaceMemberStoreKey);
        const user =
            this.requestStoreService.get<IUserWithoutPolicies>(UserStoreKey);

        const result =
            await this.projectMemberDomain.validateProjectMemberGuard(
                project?.id ?? null,
                user?.id ?? null,
                required
            );
        if (!result) {
            return true;
        }

        const {
            role: { policies, ...role },
            ...member
        } = result;
        const previousAbility = this.requestStoreService.get<IPolicyAbility>(
            PolicyAbilityStoreKey
        );
        if (!previousAbility) {
            throw new RequestContextMissingException(PolicyAbilityStoreKey);
        }
        const ability = this.policyAbilityFactory.buildFromPolicies(policies, {
            user: user ?? null,
            workspace: workspace ?? null,
            workspaceMember: workspaceMember ?? null,
            project: project ?? null,
            projectMember: member,
        });
        this.requestStoreService.set(
            PolicyAbilityStoreKey,
            this.policyAbilityFactory.build([
                ...(previousAbility.rules ?? []),
                ...(ability.rules ?? []),
            ])
        );
        this.requestStoreService.set(ProjectMemberStoreKey, {
            ...member,
            role,
        });

        return true;
    }
}
