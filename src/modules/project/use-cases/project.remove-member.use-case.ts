import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectRemoveMemberUseCase implements IAppUseCase<
    [Project, WorkspaceMember, string, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async execute(
        project: Project,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        await this.projectMemberService.removeMember(
            project,
            actor,
            targetMemberId,
            context
        );

        return {};
    }
}
