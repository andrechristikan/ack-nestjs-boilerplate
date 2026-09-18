import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCountList,
    IAnalyticStatusCountList,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceUserHttpService {
    constructor(
        private readonly analyticWorkspaceUserDomain: AnalyticWorkspaceUserDomain,
        private readonly analyticDateUtil: AnalyticDateUtil
    ) {}

    async summary(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        const data = await this.analyticWorkspaceUserDomain.summary(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async inviteFunnel(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        const statuses = await this.analyticWorkspaceUserDomain.inviteFunnel(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data: { statuses } };
    }

    async joinOutcomes(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
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
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        const data = await this.analyticWorkspaceUserDomain.activity(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
