import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceCreateUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        WorkspaceCreateRequestDto,
    ],
    IResponseReturn<Workspace>
> {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.createWorkspace(
            requestContext,
            apiKeyContext,
            authContext,
            {
                name,
                description: description ?? null,
                isPublic: isPublic ?? null,
            }
        );

        return { data: workspace };
    }
}
