import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectAssignMemberUseCase implements IAppUseCase<
    [Project, WorkspaceMember, ProjectMemberAssignRequestDto, IRequestContext],
    IResponseReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async execute(
        project: Project,
        actorMember: WorkspaceMember,
        { userId, role }: ProjectMemberAssignRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<IProjectMember>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const targetMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            );
        const member = await this.projectMemberService.assignMember(
            project,
            actor,
            targetMember,
            role,
            context
        );

        return { data: member };
    }
}
