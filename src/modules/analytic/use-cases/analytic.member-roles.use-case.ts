import type { IRequestContextWorkspace } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticRoleCountList } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticMemberRolesUseCase implements IAppUseCase<
    [IRequestContextWorkspace],
    IResponseReturn<IAnalyticRoleCountList>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService
    ) {}

    async execute(
        context: IRequestContextWorkspace
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        const roles = await this.analyticWorkspaceUserService.memberRoles(
            context.workspace.id
        );

        return { data: { roles } };
    }
}
