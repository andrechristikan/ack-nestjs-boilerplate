import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceGetCurrentUseCase implements IAppUseCase<
    [IWorkspaceContext],
    IResponseReturn<Workspace>
> {
    async execute(
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<Workspace>> {
        return { data: workspaceContext.workspace };
    }
}
