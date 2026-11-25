import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class ProjectCreateUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        ProjectCreateRequestDto,
    ],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const create = { name, description: description ?? null };
        const slugCandidates = this.projectService.drawSlugCandidates();

        for (const slug of slugCandidates) {
            try {
                const project = await this.databaseService.withTransaction(
                    async tx =>
                        this.projectService.createProjectInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            authContext,
                            workspaceContext.workspace.id,
                            create,
                            slug
                        )
                );

                return { data: project };
            } catch (error: unknown) {
                if (error instanceof ProjectSlugAlreadyExistsException) {
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
