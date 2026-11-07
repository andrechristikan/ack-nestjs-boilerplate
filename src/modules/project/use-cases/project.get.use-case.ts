import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetUseCase implements IAppUseCase<
    [Project],
    IResponseReturn<Project>
> {
    async execute(project: Project): Promise<IResponseReturn<Project>> {
        return { data: project };
    }
}
