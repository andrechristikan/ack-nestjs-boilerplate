import type { IRequestContextProject } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectAssignMemberUseCase implements IAppUseCase<
    [IRequestContextProject, ProjectMemberAssignRequestDto],
    IResponseReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async execute(
        context: IRequestContextProject,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const actor = this.projectUtil.mapMemberActor(context.workspaceMember);
        const targetMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                context.project.workspaceId,
                userId
            );
        const member = await this.projectMemberService.assignMember(
            context.snapshot,
            context.project,
            actor,
            targetMember,
            role
        );

        return { data: member };
    }
}
