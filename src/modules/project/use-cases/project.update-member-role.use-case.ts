import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectUpdateMemberRoleUseCase implements IAppUseCase<
    [
        Project,
        WorkspaceMember,
        string,
        ProjectMemberUpdateRoleRequestDto,
        IRequestContext,
    ],
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
        { role }: ProjectMemberUpdateRoleRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        await this.projectMemberService.updateMemberRole(
            project,
            actor,
            targetMemberId,
            role,
            context
        );

        return {};
    }
}
