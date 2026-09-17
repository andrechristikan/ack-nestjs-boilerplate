import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogContractByAction } from '@modules/activity-log/constants/activity-log.contract.constant';
import { ActivityLogStageStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import type {
    IActivityLog,
    IActivityLogContract,
    IActivityLogFlushOptions,
    IActivityLogMetadata,
    IActivityLogStageInput,
    IActivityLogStagedEvent,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IActivityLogCreateManyRow } from '@modules/activity-log/interfaces/activity-log.repository.interface';
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
        private readonly databaseService: DatabaseService
    ) {}

    private getContract(action: EnumActivityLogAction): IActivityLogContract {
        const found = ActivityLogContractByAction[action];
        if (!found) {
            throw new ActivityLogContractInvalidException();
        }

        return found;
    }

    stage(input: IActivityLogStageInput<EnumActivityLogAction>): void {
        const contract = this.getContract(input.action);
        const metadata = this.validateMetadata(
            input.action,
            input.metadata ?? {}
        );

        this.assertTargetOnlyField(contract.user, input.userId);
        this.assertTargetOnlyField(contract.user, input.createdBy);
        this.assertWorkspaceFields(contract.workspace, input.workspaceId);

        const staged =
            this.requestStoreService.get<IActivityLogStagedEvent[]>(
                ActivityLogStageStoreKey
            ) ?? [];

        staged.push({
            action: input.action,
            metadata,
            onError: input.onError === true,
            ...(input.userId !== undefined ? { userId: input.userId } : {}),
            ...(input.createdBy !== undefined
                ? { createdBy: input.createdBy }
                : {}),
            ...(input.workspaceId !== undefined
                ? { workspaceId: input.workspaceId }
                : {}),
        });

        this.requestStoreService.set(ActivityLogStageStoreKey, staged);
    }

    async flushStaged({
        payloadUserId,
        isError,
    }: IActivityLogFlushOptions): Promise<void> {
        const staged = this.requestStoreService.get<IActivityLogStagedEvent[]>(
            ActivityLogStageStoreKey
        );
        if (!staged?.length) {
            return;
        }

        const toFlush = isError
            ? staged.filter(event => event.onError)
            : staged;

        if (!toFlush.length) {
            this.requestStoreService.set(ActivityLogStageStoreKey, []);
            return;
        }

        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey);
        if (!requestLog) {
            throw new ActivityLogContractInvalidException();
        }

        const rows: IActivityLogCreateManyRow[] = toFlush.map(event =>
            this.buildFlushRow(event, payloadUserId, requestLog)
        );

        await this.databaseService.withTransaction(async tx => {
            await this.activityLogRepository.createManyInTx(tx, rows);
        });

        this.requestStoreService.set(ActivityLogStageStoreKey, []);
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
        value: string | undefined
    ): void {
        if (resolution === EnumActivityLogUser.target) {
            if (!value) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (value !== undefined) {
            throw new ActivityLogContractInvalidException();
        }
    }

    private assertWorkspaceFields(
        resolution: EnumActivityLogWorkspace,
        workspaceId: string | null | undefined
    ): void {
        if (resolution === EnumActivityLogWorkspace.target) {
            if (!workspaceId) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (resolution === EnumActivityLogWorkspace.none) {
            if (workspaceId !== undefined && workspaceId !== null) {
                throw new ActivityLogContractInvalidException();
            }
            return;
        }

        if (workspaceId !== undefined) {
            throw new ActivityLogContractInvalidException();
        }
    }

    private resolveUserId(
        resolution: EnumActivityLogUser,
        stagedUserId: string | undefined,
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
        stagedCreatedBy: string | undefined,
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
        stagedWorkspaceId: string | null | undefined
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

    private buildFlushRow(
        event: IActivityLogStagedEvent,
        payloadUserId: string | null,
        requestLog: IRequestLog
    ): IActivityLogCreateManyRow {
        const contract = this.getContract(event.action);
        const metadata = this.validateMetadata(event.action, event.metadata);
        const userId = this.resolveUserId(
            contract.user,
            event.userId,
            payloadUserId
        );
        const workspaceId = this.resolveWorkspaceId(
            contract.workspace,
            event.workspaceId
        );
        const createdBy = this.resolveCreatedBy(
            contract.user,
            event.createdBy,
            userId
        );

        return {
            userId,
            createdBy,
            workspaceId,
            action: event.action,
            description: this.activityLogUtil.getDescription(
                event.action,
                metadata
            ),
            requestLog,
            metadata,
        };
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
