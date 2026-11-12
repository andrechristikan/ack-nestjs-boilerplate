import type { IRequestContextWorkspace } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetCurrentUseCase implements IAppUseCase<
    [IRequestContextWorkspace],
    IResponseReturn<Workspace>
> {
    async execute(
        context: IRequestContextWorkspace
    ): Promise<IResponseReturn<Workspace>> {
        return { data: context.workspace };
    }
}
