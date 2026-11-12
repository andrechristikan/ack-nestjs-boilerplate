import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateUseCase implements IAppUseCase<
    [string, string, WorkspaceUpdateRequestDto, IRequestContext],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspace(
            workspaceId,
            actorId,
            { name, description },
            context
        );

        return { data: workspace };
    }
}
