import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticRoleCountList } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticMemberRolesUseCase implements IAppUseCase<
    [IWorkspaceContext],
    IResponseReturn<IAnalyticRoleCountList>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        const roles = await this.analyticWorkspaceUserService.memberRoles(
            workspaceContext.workspace.id
        );

        return { data: { roles } };
    }
}
