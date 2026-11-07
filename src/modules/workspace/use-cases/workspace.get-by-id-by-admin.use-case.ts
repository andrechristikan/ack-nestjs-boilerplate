import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetByIdByAdminUseCase implements IAppUseCase<
    [string],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(workspaceId: string): Promise<IResponseReturn<Workspace>> {
        const workspace =
            await this.workspaceService.getByIdByAdmin(workspaceId);

        return { data: workspace };
    }
}
