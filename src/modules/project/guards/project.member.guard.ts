import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Confirms the already-authenticated user (loaded by `UserGuard`) is a member of the project
 * resolved by `ProjectGuard`, which must run before this guard.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const user = this.requestStoreService.get<IUser>(UserStoreKey);

        const member =
            await this.projectMemberDomain.validateProjectMemberGuard(
                project?.id ?? null,
                user?.id ?? null
            );

        this.requestStoreService.set(ProjectMemberStoreKey, member);

        return true;
    }
}
