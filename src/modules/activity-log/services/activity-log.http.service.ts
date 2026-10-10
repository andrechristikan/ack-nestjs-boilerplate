import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import type {
    IActivityLog,
    IActivityLogScope,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogHttpService {
    constructor(
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffset(
        scope: IActivityLogScope,
        query: ActivityLogAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.ActivityLog
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.activityLogDomain.getListOffset(
            scope,
            params,
            accessibleWhere
        );

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        scope: IActivityLogScope,
        query: ActivityLogSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.activityLogDomain.getListCursor(
            scope,
            params
        );

        return {
            data,
            ...others,
        };
    }
}
