import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project } from '@generated/prisma-client/client';
import { ProjectMemberPolicyStoreKey } from '@modules/policy/constants/policy.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Loads the caller's membership of the project resolved by `ProjectGuard`, which must run before
 * this guard, stores the membership with its role (without policies), and stores the role's policies under the project policy key. `@ProjectMemberProtected()`
 * (strict, the default) rejects a caller with no `ProjectMember` row;
 * `@ProjectMemberProtected({ required: false })` lets that caller through with the workspace
 * policies alone.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredMeta = this.reflector.get<boolean | undefined>(
            ProjectMemberRequiredMetaKey,
            context.getHandler()
        );
        const required = requiredMeta ?? true;

        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const user = this.requestStoreService.get<IUser>(UserStoreKey);

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
        this.requestStoreService.set(ProjectMemberStoreKey, {
            ...member,
            role,
        });
        this.requestStoreService.set(ProjectMemberPolicyStoreKey, policies);

        return true;
    }
}
