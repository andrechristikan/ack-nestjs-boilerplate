import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project } from '@generated/prisma-client/client';
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
 * this guard, and stores the membership with its role. It loads no policies and builds no ability.
 * `@ProjectMemberProtected()` (strict, the default) rejects a caller with no `ProjectMember` row;
 * `@ProjectMemberProtected({ required: false })` lets that caller through with no member stored.
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

        const member =
            await this.projectMemberDomain.validateProjectMemberGuard(
                project?.id ?? null,
                user?.id ?? null,
                required
            );
        if (!member) {
            return true;
        }

        this.requestStoreService.set(ProjectMemberStoreKey, member);

        return true;
    }
}
