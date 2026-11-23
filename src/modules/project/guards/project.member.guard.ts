import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { ProjectContextStoreKey } from '@modules/project/constants/project.constant';
import type {
    IProjectContext,
    IProjectContextPatch,
} from '@modules/project/interfaces/project.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const userContext =
            this.requestStoreService.get<IUserContext>(UserContextStoreKey);
        const user = userContext?.user ?? null;
        if (user === null) {
            throw new UserGuardMissingException();
        }

        const projectContext =
            this.requestStoreService.get<IProjectContextPatch>(
                ProjectContextStoreKey
            );
        const project = projectContext?.project ?? null;
        if (project === null) {
            throw new ProjectGuardMissingException();
        }

        const member = await this.projectMemberService.getMemberOrNull(
            project.id,
            user.id
        );

        this.requestStoreService.merge<IProjectContext>(
            ProjectContextStoreKey,
            { projectMember: member }
        );

        return true;
    }
}
