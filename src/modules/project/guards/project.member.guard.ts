import {
    RequestProjectMemberStoreKey,
    RequestProjectStoreKey,
    RequestUserStoreKey,
} from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
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
        const user = this.requestStoreService.get<IUser>(RequestUserStoreKey);
        if (!user) {
            throw new UserGuardMissingException();
        }

        const project = this.requestStoreService.get<Project>(
            RequestProjectStoreKey
        );
        if (!project) {
            throw new ProjectGuardMissingException();
        }

        const member =
            await this.projectMemberService.validateProjectMemberGuard(
                project.id,
                user.id
            );

        this.requestStoreService.set(RequestProjectMemberStoreKey, member);

        return true;
    }
}
