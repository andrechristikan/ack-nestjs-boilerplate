import { subject } from '@casl/ability';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import type { FeatureFlag } from '@generated/prisma-client/client';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import type { FeatureFlagSystemListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagHttpService {
    constructor(
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListByAdmin(
        query: FeatureFlagAdminListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.FeatureFlag
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.FeatureFlagWhereInput>(
                query,
                {
                    availableSearch: FeatureFlagDefaultAvailableSearch,
                    availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.featureFlagDomain.getListByAdmin(
            params,
            accessibleWhere
        );

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        query: FeatureFlagSystemListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.FeatureFlagWhereInput>(
                query,
                {
                    availableSearch: FeatureFlagDefaultAvailableSearch,
                    availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.featureFlagDomain.getListCursor(params);

        return {
            data,
            ...others,
        };
    }

    async updateStatusByAdmin(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const stored = await this.featureFlagDomain.getOne(id);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.FeatureFlag, stored)
        );
        const updated = await this.featureFlagDomain.updateStatusByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }

    async updateMetadataByAdmin(
        id: string,
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const stored = await this.featureFlagDomain.getOne(id);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.FeatureFlag, stored)
        );
        const updated = await this.featureFlagDomain.updateMetadataByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }
}
