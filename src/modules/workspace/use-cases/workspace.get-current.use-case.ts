import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetCurrentUseCase implements IAppUseCase<
    [Workspace],
    IResponseReturn<Workspace>
> {
    async execute(workspace: Workspace): Promise<IResponseReturn<Workspace>> {
        return { data: workspace };
    }
}
