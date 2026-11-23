import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyGetListByAdminUseCase implements IAppUseCase<
    [IPolicyContext, ApiKeyListRequestDto],
    IResponsePaginationReturn<IApiKey>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        query: ApiKeyListRequestDto
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.ApiKey
        );
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableSearch: ApiKeyDefaultAvailableSearch,
            availableOrderBy: ApiKeyDefaultAvailableOrderBy,
        });
        const isActive = this.paginationFilterUtil.equalBoolean(
            Prisma.ApiKeyScalarFieldEnum.isActive,
            query.isActive
        );
        const type = this.paginationFilterUtil.inEnum(
            Prisma.ApiKeyScalarFieldEnum.type,
            query.type,
            ApiKeyDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isActive?.storeFilter ?? {}),
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.apiKeyService.getListByAdmin(
            params,
            isActive?.where ?? null,
            type?.where ?? null,
            additionalWhere
        );

        return {
            data,
            ...others,
        };
    }
}
