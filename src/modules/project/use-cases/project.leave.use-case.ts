import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectLeaveUseCase implements IAppUseCase<
    [Project, ProjectMember, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly projectMemberService: ProjectMemberService) {}

    async execute(
        project: Project,
        member: ProjectMember,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.projectMemberService.leaveProject(project, member, context);

        return {};
    }
}
