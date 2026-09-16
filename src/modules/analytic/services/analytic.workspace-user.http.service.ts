import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import {
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
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

    summary(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticWorkspaceSummary> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticWorkspaceUserDomain.summary(
            workspaceId,
            range.startDate,
            range.endDate
        );
    }

    inviteFunnel(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticStatusCount[]> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticWorkspaceUserDomain.inviteFunnel(
            workspaceId,
            range.startDate,
            range.endDate
        );
    }

    joinOutcomes(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticStatusCount[]> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticWorkspaceUserDomain.joinOutcomes(
            workspaceId,
            range.startDate,
            range.endDate
        );
    }

    memberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        return this.analyticWorkspaceUserDomain.memberRoles(workspaceId);
    }

    activity(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticWorkspaceUserDomain.activity(
            workspaceId,
            range.startDate,
            range.endDate
        );
    }
}
