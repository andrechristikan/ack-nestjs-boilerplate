import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
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
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const create = {
            name,
            description: description ?? null,
            isPublic: isPublic ?? null,
        };
        await this.workspaceService.assertOwnedCapAvailable(authContext.userId);
        const slugCandidates = this.workspaceService.drawSlugCandidates();

        for (const slug of slugCandidates) {
            const workspaceId = this.databaseUtil.createId();

            try {
                const workspace = await this.databaseService.withTransaction(
                    async tx =>
                        this.workspaceService.createWorkspaceInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            authContext,
                            workspaceId,
                            slug,
                            create
                        )
                );

                return { data: workspace };
            } catch (error: unknown) {
                if (error instanceof WorkspaceSlugAlreadyExistsException) {
                    continue;
                }

                if (error instanceof AppBaseException) {
                    throw error;
                }

                throw new AppUnknownException(error);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }
}
