import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { ActivityLogStageStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import type {
    IActivityLog,
    IActivityLogActionContract,
    IActivityLogFlushOptions,
    IActivityLogMetadata,
    IActivityLogStageInput,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IActivityLogCreate } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { Injectable } from '@nestjs/common';
import type { Workspace } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogDomain {
    constructor(
        private readonly activityLogRepository: ActivityLogRepository,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private getContract(
        action: EnumActivityLogAction
    ): IActivityLogActionContract {
        const found = ActivityLogActionContract[action];
        if (!found) {
            throw new ActivityLogContractInvalidException();
        }

        return found;
    }

    private validateMetadata(
        action: EnumActivityLogAction,
        metadata: IActivityLogMetadata
    ): IActivityLogMetadata {
        const contract = this.getContract(action);
        const parsed = contract.metadata.safeParse(metadata);
        if (!parsed.success) {
            throw new ActivityLogContractInvalidException(parsed.error);
        }

        return parsed.data as IActivityLogMetadata;
    }

    private assertTargetOnlyField(
        resolution: EnumActivityLogUser,
        value: string | null
    ): void {
        if (resolution === EnumActivityLogUser.target) {
            if (!value) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (value !== null) {
            throw new ActivityLogContractInvalidException();
        }
    }

    private assertWorkspaceFields(
        resolution: EnumActivityLogWorkspace,
        workspaceId: string | null
    ): void {
        if (resolution === EnumActivityLogWorkspace.target) {
            if (!workspaceId) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (resolution === EnumActivityLogWorkspace.none) {
            if (workspaceId !== null) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (workspaceId !== null) {
            throw new ActivityLogContractInvalidException();
        }
    }

    private resolveUserId(
        resolution: EnumActivityLogUser,
        stagedUserId: string | null,
        payloadUserId: string | null
    ): string {
        if (resolution === EnumActivityLogUser.target) {
            if (!stagedUserId) {
                throw new ActivityLogContractInvalidException();
            }
            return stagedUserId;
        }

        if (!payloadUserId) {
            throw new ActivityLogContractInvalidException();
        }

        return payloadUserId;
    }

    private resolveCreatedBy(
        resolution: EnumActivityLogUser,
        stagedCreatedBy: string | null,
        userId: string
    ): string {
        if (resolution === EnumActivityLogUser.target) {
            if (!stagedCreatedBy) {
                throw new ActivityLogContractInvalidException();
            }
            return stagedCreatedBy;
        }

        return userId;
    }

    private resolveWorkspaceId(
        resolution: EnumActivityLogWorkspace,
        stagedWorkspaceId: string | null
    ): string | null {
        if (resolution === EnumActivityLogWorkspace.none) {
            return null;
        }

        if (resolution === EnumActivityLogWorkspace.target) {
            if (!stagedWorkspaceId) {
                throw new ActivityLogContractInvalidException();
            }
            return stagedWorkspaceId;
        }

        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        if (!workspace?.id) {
            throw new ActivityLogContractInvalidException();
        }

        return workspace.id;
    }

    private buildFlushCreate(
        activityLog: IActivityLogStaged,
        payloadUserId: string | null,
        requestLog: IRequestLog,
        createdAt: Date
    ): IActivityLogCreate {
        const contract = this.getContract(activityLog.action);
        const metadata = this.validateMetadata(
            activityLog.action,
            activityLog.metadata
        );
        const userId = this.resolveUserId(
            contract.user,
            activityLog.userId,
            payloadUserId
        );
        const workspaceId = this.resolveWorkspaceId(
            contract.workspace,
            activityLog.workspaceId
        );
        const createdBy = this.resolveCreatedBy(
            contract.user,
            activityLog.createdBy,
            userId
        );

        const description = this.activityLogUtil.getDescription(
            activityLog.action,
            metadata
        );

        const id = this.databaseUtil.createId();

        return {
            id,
            userId,
            createdBy,
            workspaceId,
            action: activityLog.action,
            description,
            requestLog,
            metadata,
            createdAt,
        };
    }

    prepare(
        input: IActivityLogStageInput<EnumActivityLogAction>
    ): IActivityLogStaged {
        const contract = this.getContract(input.action);
        const metadata = this.validateMetadata(
            input.action,
            input.metadata ?? {}
        );

        const userId = input.userId ?? null;
        const createdBy = input.createdBy ?? null;
        const workspaceId = input.workspaceId ?? null;
        this.assertTargetOnlyField(contract.user, userId);
        this.assertTargetOnlyField(contract.user, createdBy);
        this.assertWorkspaceFields(contract.workspace, workspaceId);

        return {
            action: input.action,
            metadata,
            userId,
            createdBy,
            workspaceId,
        };
    }

    stagePrepared(activityLogs: IActivityLogStaged[]): void {
        if (activityLogs.length === 0) {
            return;
        }

        const stagedActivityLogs = this.requestStoreService.get<
            IActivityLogStaged[]
        >(ActivityLogStageStoreKey);
        const staged = stagedActivityLogs ?? [];
        staged.push(...activityLogs);

        this.requestStoreService.set(ActivityLogStageStoreKey, staged);
    }

    async flushStaged({
        payloadUserId,
    }: IActivityLogFlushOptions): Promise<void> {
        const staged = this.requestStoreService.get<IActivityLogStaged[]>(
            ActivityLogStageStoreKey
        );
        if (!staged?.length) {
            return;
        }

        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey);
        if (!requestLog) {
            throw new ActivityLogContractInvalidException();
        }

        const createdAt = this.helperDateService.create();
        const rows: IActivityLogCreate[] = [];
        for (const activityLog of staged) {
            const row = this.buildFlushCreate(
                activityLog,
                payloadUserId,
                requestLog,
                createdAt
            );
            rows.push(row);
        }

        await this.activityLogQueue.createMany(rows);

        this.requestStoreService.set(ActivityLogStageStoreKey, []);
    }

    async createMany(rows: IActivityLogCreate[]): Promise<void> {
        await this.activityLogRepository.createMany(rows);
    }

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationOffset(
            userId,
            pagination
        );
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findUserScopedWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
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
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogRepository.findByWorkspaceWithPaginationCursor(
            workspaceId,
            userId,
            pagination
        );
    }
}
