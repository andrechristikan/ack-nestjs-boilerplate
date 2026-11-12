import type { IRequestContextProject } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetUseCase implements IAppUseCase<
    [IRequestContextProject],
    IResponseReturn<Project>
> {
    async execute(
        context: IRequestContextProject
    ): Promise<IResponseReturn<Project>> {
        return { data: context.project };
    }
}
