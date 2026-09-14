import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    ActivityLog,
    EnumActivityLogAction,
    Prisma,
} from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { HttpException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ActivityLogDomain {
    private readonly logger: Logger = new Logger(ActivityLogDomain.name);

    constructor(
        private readonly activityLogRepository: ActivityLogRepository,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private serializeError(rawError: unknown): {
        errorMessage: string;
        errorStack?: string;
    } {
        if (rawError instanceof HttpException) {
            const response = rawError.getResponse();
            const errorMessage =
                typeof response === 'string'
                    ? response
                    : ((response as { message: string }).message ??
                      rawError.message);
            return {
                errorMessage,
                errorStack: rawError.stack,
            };
        } else if (rawError instanceof Error) {
            return {
                errorMessage: rawError.message,
                errorStack: rawError.stack,
            };
        } else if (typeof rawError === 'object' && rawError !== null) {
            return {
                errorMessage: JSON.stringify(rawError),
            };
        }

        return {
            errorMessage: String(rawError),
        };
    }

    /**
     * Writes the activity log row for the request in scope, and resolves without throwing when the write fails.
     */
    async create(
        userId: string,
        action: EnumActivityLogAction,
        rawError: unknown
    ): Promise<void> {
        const { ipAddress, userAgent, geoLocation } =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const metadata =
            this.requestStoreService.get<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey
            ) ?? {};

        try {
            let description = this.activityLogUtil.getDescription(
                action,
                metadata
            );
            let error: {
                errorMessage?: string;
            } = {};
            if (rawError) {
                const { errorMessage, errorStack } =
                    this.serializeError(rawError);
                error = { errorMessage };
                description += ` - Error: ${errorMessage}`;

                if (errorStack) {
                    description += ` - Stack: ${errorStack}`;
                }
            }

            await this.activityLogRepository.create(
                userId,
                action,
                description,
                {
                    ipAddress,
                    userAgent,
                    geoLocation,
                },
                {
                    ...metadata,
                    ...error,
                }
            );
        } catch (error: unknown) {
            this.logger.error(
                error,
                `Failed to save activity log for user ${userId} and action ${action}`
            );
        }
    }

    /**
     * Writes the activity log row inside a caller-owned transaction. A failure
     * rejects so the transaction rolls back with the change it records.
     */
    async recordInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        action: EnumActivityLogAction,
        requestLog: IRequestLog,
        workspaceId: string | null
    ): Promise<ActivityLog> {
        const metadata =
            this.requestStoreService.get<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey
            ) ?? {};

        return this.activityLogRepository.createInTx(
            tx,
            userId,
            action,
            this.activityLogUtil.getDescription(action, metadata),
            requestLog,
            metadata,
            workspaceId
        );
    }

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationOffset(
            userId,
            pagination
        );
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogRepository.findByWorkspaceWithPaginationOffset(
            workspaceId,
            userId,
            pagination
        );
    }

    async getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogRepository.findByWorkspaceWithPaginationCursor(
            workspaceId,
            userId,
            pagination
        );
    }
}
