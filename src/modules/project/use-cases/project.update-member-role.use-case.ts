import type { IRequestContextProject } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectUpdateMemberRoleUseCase implements IAppUseCase<
    [IRequestContextProject, string, ProjectMemberUpdateRoleRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async execute(
        context: IRequestContextProject,
        targetMemberId: string,
        { role }: ProjectMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(context.workspaceMember);
        await this.projectMemberService.updateMemberRole(
            context.snapshot,
            context.project,
            actor,
            targetMemberId,
            role
        );

        return {};
    }
}
