import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import type {
    IActivityLogActionContract,
    IActivityLogActorPayload,
    IActivityLogContextPayload,
    IActivityLogCreate,
    IActivityLogCreateManyEffect,
    IActivityLogInput,
    IActivityLogMetadata,
    IActivityLogMetadataParseResult,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ActivityLogQueue extends QueueBase {
    constructor(
        @InjectQueue(EnumActivityLogQueue.activityLog)
        protected readonly queue: Queue,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {
        super(queue);
    }

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
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext | null,
        workspaceContext: IWorkspaceContext | null,
        input: IActivityLogInput<EnumActivityLogAction>
    ): IActivityLogCreateManyEffect {
        const payload = this.toPayload(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext
        );

        return this.recordEffectFromPayload(payload, input);
    }

    recordEffectFromPayload(
        payload: IActivityLogContextPayload,
        input: IActivityLogInput<EnumActivityLogAction>
    ): IActivityLogCreateManyEffect {
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
            payload.actorUserId,
            payload.workspaceId,
            payload.requestLog,
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

    toPayload(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext | null
    ): IActivityLogActorPayload;
    toPayload(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext | null,
        workspaceContext: IWorkspaceContext | null
    ): IActivityLogContextPayload;
    toPayload(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext | null,
        workspaceContext: IWorkspaceContext | null
    ): IActivityLogContextPayload {
        return {
            apiKeyId: apiKeyContext.apiKey.id,
            actorUserId: authContext?.userId ?? null,
            workspaceId: workspaceContext?.workspaceId ?? null,
            requestLog: requestContext.requestLog,
        };
    }
}
