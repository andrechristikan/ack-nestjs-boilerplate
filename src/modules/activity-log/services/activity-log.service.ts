import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogCreate,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ActivityLogService {
    private readonly retentionInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly activityLogRepository: ActivityLogRepository,
        private readonly helperDateService: HelperDateService
    ) {
        this.retentionInMs = this.configService.get<number>(
            'activityLog.retentionInMs'
        )!;
    }

    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.now();
        const retention = this.helperDateService.createDuration({
            milliseconds: this.retentionInMs,
        });
        const threshold = this.helperDateService.backward(now, retention);

        return this.activityLogRepository.deleteExpiredBefore(threshold);
    }

    async createMany(rows: IActivityLogCreate[]): Promise<void> {
        await this.activityLogRepository.createMany(rows);
    }

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationOffset(
            userId,
            pagination
        );
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findByWorkspaceWithPaginationOffset(
            workspaceId,
            userId,
            pagination
        );
    }

    async getListOffsetByApiKey(
        apiKeyId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findByApiKeyWithPaginationOffset(
            apiKeyId,
            pagination
        );
    }

    async getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findByWorkspaceWithPaginationCursor(
            workspaceId,
            userId,
            pagination
        );
    }
}
