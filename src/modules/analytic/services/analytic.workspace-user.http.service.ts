import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCountList,
    IAnalyticStatusCountList,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceUserHttpService {
    constructor(
        private readonly analyticWorkspaceUserDomain: AnalyticWorkspaceUserDomain,
        private readonly analyticDateDomain: AnalyticDateDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    /** Authorizes read of workspace analytics for the request workspace. */
    private authorizeWorkspace(workspaceId: string): void {
        this.policyAbilityDomain.authorize(
            EnumPolicyAction.read,
            subject(EnumPolicySubject.WorkspaceAnalytic, { workspaceId })
        );
    }

    async summary(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        this.authorizeWorkspace(workspaceId);
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticWorkspaceUserDomain.summary(
            workspaceId,
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async inviteFunnel(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        this.authorizeWorkspace(workspaceId);
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
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
        this.authorizeWorkspace(workspaceId);
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
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
        this.authorizeWorkspace(workspaceId);
        const roles =
            await this.analyticWorkspaceUserDomain.memberRoles(workspaceId);

        return { data: { roles } };
    }

    async activity(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        this.authorizeWorkspace(workspaceId);
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticWorkspaceUserDomain.activity(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
