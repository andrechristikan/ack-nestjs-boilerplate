import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import type { IAnalyticBlockedUsers } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticUsersBlockedUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticBlockedUsers>
> {
    constructor(
        private readonly analyticUserService: AnalyticUserService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticBlockedUsers>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticUserService.usersBlocked(
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
