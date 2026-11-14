import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceUpdateSlugUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        WorkspaceUpdateSlugRequestDto,
    ],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspaceSlug(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext.workspace.id,
            slug
        );

        return { data: workspace };
    }
}
