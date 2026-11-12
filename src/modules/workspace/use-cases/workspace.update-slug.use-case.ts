import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateSlugUseCase implements IAppUseCase<
    [string, string, WorkspaceUpdateSlugRequestDto, IRequestContext],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspaceSlug(
            workspaceId,
            actorId,
            slug,
            context
        );

        return { data: workspace };
    }
}
