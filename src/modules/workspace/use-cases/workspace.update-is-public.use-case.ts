import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateIsPublicUseCase implements IAppUseCase<
    [string, string, WorkspaceUpdateIsPublicRequestDto, IRequestContext],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { isPublic }: WorkspaceUpdateIsPublicRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspaceIsPublic(
            workspaceId,
            actorId,
            isPublic,
            context
        );

        return { data: workspace };
    }
}
