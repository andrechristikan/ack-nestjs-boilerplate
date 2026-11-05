import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type {
    IApiKey,
    IApiKeyActivityLogSubject,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyHttpService {
    constructor(
        private readonly apiKeyDomain: ApiKeyDomain,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        apiKey: IApiKeyActivityLogSubject
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
        const metadata = this.apiKeyUtil.mapActivityLogMetadata(
            apiKey,
            timestamp
        );

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async getListByAdmin(
        query: ApiKeyListRequestDto
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ApiKeyWhereInput>(query, {
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

        const { data, ...others } = await this.apiKeyDomain.getListByAdmin(
            params,
            isActive?.where,
            type?.where
        );

        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const apiKeyId = this.databaseUtil.createId();
        const activityLogs = [
            this.prepareActivityLog(EnumActivityLogAction.adminApiKeyCreate, {
                id: apiKeyId,
                name: body.name,
                type: body.type,
            }),
        ];

        const { apiKey, secret } = await this.apiKeyDomain.createByAdmin(
            apiKeyId,
            {
                name: body.name,
                type: body.type,
                startAt: body.startAt ?? null,
                endAt: body.endAt ?? null,
            }
        );
        this.activityLogDomain.stagePrepared(activityLogs);
        const created = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: created };
    }

    async updateStatusByAdmin(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        const updated = await this.apiKeyDomain.updateStatusByAdmin(
            id,
            isActive
        );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdateStatus,
                updated
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {
            data: updated,
        };
    }

    async updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        const updated = await this.apiKeyDomain.updateByAdmin(id, name);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdate,
                updated
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {
            data: updated,
        };
    }

    async updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        const updated = await this.apiKeyDomain.updateDatesByAdmin(
            id,
            startAt,
            endAt
        );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdateDate,
                updated
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {
            data: updated,
        };
    }

    async resetByAdmin(
        id: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const { apiKey, secret } = await this.apiKeyDomain.resetByAdmin(id);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyReset,
                apiKey
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);
        const reset = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: reset };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<IApiKey>> {
        const deleted = await this.apiKeyDomain.deleteByAdmin(id);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyDelete,
                deleted
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {
            data: deleted,
        };
    }
}
