import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import type { IAnalyticActiveUsers } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticUsersActiveUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticActiveUsers>
> {
    constructor(private readonly analyticUserService: AnalyticUserService) {}

    async execute(): Promise<IResponseReturn<IAnalyticActiveUsers>> {
        const data = await this.analyticUserService.usersActive();

        return { data };
    }
}
