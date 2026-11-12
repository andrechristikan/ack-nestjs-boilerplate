import type { IRequestContextProjectMember } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectLeaveUseCase implements IAppUseCase<
    [IRequestContextProjectMember],
    IResponseReturn<void>
> {
    constructor(private readonly projectMemberService: ProjectMemberService) {}

    async execute(
        context: IRequestContextProjectMember
    ): Promise<IResponseReturn<void>> {
        await this.projectMemberService.leaveProject(
            context.snapshot,
            context.project,
            context.projectMember
        );

        return {};
    }
}
