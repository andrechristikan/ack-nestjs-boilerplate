import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import type {
    IActivityLog,
    IActivityLogActionContract,
    IActivityLogInput,
    IActivityLogMetadata,
    IActivityLogMetadataParseResult,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IActivityLogCreate } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogService {
    constructor(
        private readonly activityLogRepository: ActivityLogRepository,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private getContract(
        action: EnumActivityLogAction
    ): IActivityLogActionContract {
        const contract = ActivityLogActionContract[action] ?? null;
        if (!contract) {
            throw new ActivityLogContractInvalidException();
        }

        return contract;
    }

    private parseMetadata(
        contract: IActivityLogActionContract,
        metadata: IActivityLogMetadata
    ): IActivityLogMetadataParseResult {
        return contract.metadata.safeParse(metadata);
    }

    private validateMetadata(
        action: EnumActivityLogAction,
        metadata: IActivityLogMetadata
    ): IActivityLogMetadata {
        const contract = this.getContract(action);
        const parsed = this.parseMetadata(contract, metadata);
        if (!parsed.success) {
            throw new ActivityLogContractInvalidException(parsed.error);
        }

        return parsed.data;
    }

    private isTargetOnlyFieldValid(
        resolution: EnumActivityLogUser,
        value: string | null
    ): boolean {
        if (resolution === EnumActivityLogUser.target) {
            return value !== null && value !== '';
        }

        return value === null;
    }

    private isWorkspaceFieldValid(
        resolution: EnumActivityLogWorkspace,
        workspaceId: string | null
    ): boolean {
        if (resolution === EnumActivityLogWorkspace.target) {
            return workspaceId !== null && workspaceId !== '';
        }

        return workspaceId === null;
    }

    private resolveUserId(
        resolution: EnumActivityLogUser,
        stagedUserId: string | null,
        payloadUserId: string | null
    ): string {
        const resolvedUserId =
            resolution === EnumActivityLogUser.target
                ? stagedUserId
                : payloadUserId;
        const userId = resolvedUserId === '' ? null : resolvedUserId;
        if (userId === null) {
            throw new ActivityLogContractInvalidException();
        }

        return userId;
    }

    private resolveCreatedBy(
        resolution: EnumActivityLogUser,
        stagedCreatedBy: string | null,
        userId: string
    ): string {
        if (resolution !== EnumActivityLogUser.target) {
            return userId;
        }

        const createdBy = stagedCreatedBy === '' ? null : stagedCreatedBy;
        if (createdBy === null) {
            throw new ActivityLogContractInvalidException();
        }

        return createdBy;
    }

    private resolveWorkspaceId(
        resolution: EnumActivityLogWorkspace,
        stagedWorkspaceId: string | null,
        payloadWorkspaceId: string | null
    ): string | null {
        if (resolution === EnumActivityLogWorkspace.payload) {
            if (payloadWorkspaceId === null || payloadWorkspaceId === '') {
                throw new ActivityLogContractInvalidException();
            }

            return payloadWorkspaceId;
        }

        const workspaceId =
            resolution !== EnumActivityLogWorkspace.target ||
            stagedWorkspaceId === ''
                ? null
                : stagedWorkspaceId;
        const isWorkspaceIdValid = this.isWorkspaceFieldValid(
            resolution,
            workspaceId
        );
        if (!isWorkspaceIdValid) {
            throw new ActivityLogContractInvalidException();
        }

        return workspaceId;
    }

    private buildCreate(
        input: IActivityLogInput<EnumActivityLogAction>,
        payloadUserId: string | null,
        payloadWorkspaceId: string | null,
        requestLog: IRequestLog,
        createdAt: Date
    ): IActivityLogCreate {
        const contract = this.getContract(input.action);
        const metadata = this.validateMetadata(
            input.action,
            input.metadata ?? {}
        );
        const userId = this.resolveUserId(
            contract.user,
            input.userId ?? null,
            payloadUserId
        );
        const workspaceId = this.resolveWorkspaceId(
            contract.workspace,
            input.workspaceId ?? null,
            payloadWorkspaceId
        );
        const createdBy = this.resolveCreatedBy(
            contract.user,
            input.createdBy ?? null,
            userId
        );

        const description = this.activityLogUtil.getDescription(
            input.action,
            metadata
        );

        const id = this.databaseUtil.createId();

        return {
            id,
            userId,
            createdBy,
            workspaceId,
            action: input.action,
            description,
            requestLog,
            metadata,
            createdAt,
        };
    }

    recordEffect(
        input: IActivityLogInput<EnumActivityLogAction>,
        context: IRequestContext
    ): IOutboxEffect {
        const contract = this.getContract(input.action);
        const isUserIdValid = this.isTargetOnlyFieldValid(
            contract.user,
            input.userId ?? null
        );
        const isCreatedByValid = this.isTargetOnlyFieldValid(
            contract.user,
            input.createdBy ?? null
        );
        const isWorkspaceIdValid = this.isWorkspaceFieldValid(
            contract.workspace,
            input.workspaceId ?? null
        );
        if (!isUserIdValid || !isCreatedByValid || !isWorkspaceIdValid) {
            throw new ActivityLogContractInvalidException();
        }

        const createdAt = this.helperDateService.create();
        const row = this.buildCreate(
            input,
            context.actorUserId,
            context.workspaceId,
            context.requestLog,
            createdAt
        );

        const createdAtIso = this.helperDateService.formatToIso(createdAt);

        return {
            queue: EnumActivityLogQueue.activityLog,
            name: EnumActivityLogProcess.createMany,
            data: { rows: [{ ...row, createdAt: createdAtIso }] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
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
