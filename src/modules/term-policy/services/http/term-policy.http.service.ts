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
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import type { ITermPolicyActivityLogSubject } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
    TermPolicyPublicListCursorScope,
} from '@modules/term-policy/constants/term-policy.list.constant';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyHttpService {
    constructor(
        private readonly termPolicyDomain: TermPolicyDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly termPolicyQueue: TermPolicyQueue,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: ITermPolicyActivityLogSubject,
        timestamp: Date
    ): IActivityLogStaged {
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async getListByAdmin(
        query: TermPolicyAdminListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.TermPolicyWhereInput>(
                query,
                { availableOrderBy: TermPolicyDefaultAvailableOrderBy }
            );
        const type = this.paginationFilterUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.type,
            query.type,
            TermPolicyDefaultType
        );
        const status = this.paginationFilterUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.status,
            query.status,
            TermPolicyDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.termPolicyDomain.getListByAdmin(
            params,
            type?.where,
            status?.where
        );
        return {
            data,
            ...others,
        };
    }

    async getListPublished(
        query: TermPolicyPublicListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.TermPolicyWhereInput>(
                query,
                {
                    scope: TermPolicyPublicListCursorScope,
                    availableOrderBy: TermPolicyDefaultAvailableOrderBy,
                }
            );
        const type = this.paginationFilterUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.type,
            query.type,
            TermPolicyDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.termPolicyDomain.getListPublished(params, type?.where);
        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<TermPolicy>> {
        const termPolicyId = this.databaseUtil.createId();
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyCreate,
                { id: termPolicyId, type: body.type, version: body.version },
                timestamp
            ),
        ];

        const created = await this.termPolicyDomain.createByAdmin(
            termPolicyId,
            body
        );
        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: created };
    }

    async deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicy>> {
        const deleted = await this.termPolicyDomain.deleteByAdmin(termPolicyId);
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyDelete,
                deleted,
                timestamp
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: deleted };
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const { termPolicy: published, copy } =
            await this.termPolicyDomain.publishByAdmin(termPolicyId);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyPublish,
                published,
                published.updatedAt
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        const recipientCutoffAt = this.helperDateService.formatToIso(
            published.publishedAt!
        );
        await Promise.all([
            this.termPolicyQueue.copyContent(copy),
            this.notificationQueue.sendPublishTermPolicy(
                {
                    termPolicyId: published.id,
                    type: published.type,
                    version: published.version,
                    recipientCutoffAt,
                    resendNonce: null,
                },
                updatedBy
            ),
        ]);

        return {};
    }

    async resendEmailByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyDomain.getPublishedByAdmin(termPolicyId);
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyResendEmail,
                termPolicy,
                timestamp
            ),
        ];

        const recipientCutoffAt = this.helperDateService.formatToIso(
            termPolicy.publishedAt!
        );
        await this.notificationQueue.sendResendPublishTermPolicy(
            {
                termPolicyId: termPolicy.id,
                type: termPolicy.type,
                version: termPolicy.version,
                recipientCutoffAt,
            },
            updatedBy
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
