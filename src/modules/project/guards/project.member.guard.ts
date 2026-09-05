import { RequestStoreService } from '@common/request/services/request.store.service';
import { Project } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Confirms the already-authenticated user (loaded by `UserGuard`) is a member of the project
 * resolved by `ProjectGuard`, which must run before this guard.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const user = this.requestStoreService.get<IUser>(UserStoreKey);

        const member =
            await this.projectMemberService.validateProjectMemberGuard(
                project?.id ?? null,
                user?.id ?? null
            );

        this.requestStoreService.set(ProjectMemberStoreKey, member);

        return true;
    }
}
