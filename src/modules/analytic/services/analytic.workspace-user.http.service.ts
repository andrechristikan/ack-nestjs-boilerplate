import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCountList,
    IAnalyticStatusCountList,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceUserHttpService {
    constructor(
        private readonly analyticWorkspaceUserDomain: AnalyticWorkspaceUserDomain,
        private readonly analyticDateDomain: AnalyticDateDomain
    ) {}

    async summary(
        workspaceId: string,
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticWorkspaceUserDomain.summary(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async inviteFunnel(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const statuses = await this.analyticWorkspaceUserDomain.inviteFunnel(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data: { statuses } };
    }

    async joinOutcomes(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const statuses = await this.analyticWorkspaceUserDomain.joinOutcomes(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data: { statuses } };
    }

    async memberRoles(
        workspaceId: string
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        const roles =
            await this.analyticWorkspaceUserDomain.memberRoles(workspaceId);

        return { data: { roles } };
    }

    async activity(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticWorkspaceUserDomain.activity(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
