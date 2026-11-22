import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectGetUseCase implements IAppUseCase<
    [IProjectContext],
    IResponseReturn<Project>
> {
    async execute(
        projectContext: IProjectContext
    ): Promise<IResponseReturn<Project>> {
        return { data: projectContext.project };
    }
}
