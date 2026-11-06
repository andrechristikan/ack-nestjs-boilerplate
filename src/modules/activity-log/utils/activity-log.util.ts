import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogActionContract,
    IActivityLogMetadata,
    IActivityLogMetadataParseResult,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogUtil {
    constructor(
        private readonly messageService: MessageService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    getDescription(
        action: string,
        metadata: IActivityLogMetadata | null
    ): string {
        return this.messageService.setMessage(`activityLog.${action}`, {
            ...(metadata !== null && { properties: metadata }),
        });
    }

    getContract(
        action: EnumActivityLogAction
    ): IActivityLogActionContract | null {
        return ActivityLogActionContract[action] ?? null;
    }

    parseMetadata(
        contract: IActivityLogActionContract,
        metadata: IActivityLogMetadata
    ): IActivityLogMetadataParseResult {
        return contract.metadata.safeParse(metadata);
    }

    isTargetOnlyFieldValid(
        resolution: EnumActivityLogUser,
        value: string | null
    ): boolean {
        if (resolution === EnumActivityLogUser.target) {
            return value !== null && value !== '';
        }

        return value === null;
    }

    isWorkspaceFieldValid(
        resolution: EnumActivityLogWorkspace,
        workspaceId: string | null
    ): boolean {
        if (resolution === EnumActivityLogWorkspace.target) {
            return workspaceId !== null && workspaceId !== '';
        }

        return workspaceId === null;
    }

    resolveUserId(
        resolution: EnumActivityLogUser,
        stagedUserId: string | null,
        payloadUserId: string | null
    ): string | null {
        const userId =
            resolution === EnumActivityLogUser.target
                ? stagedUserId
                : payloadUserId;

        return userId === '' ? null : userId;
    }

    resolveCreatedBy(
        resolution: EnumActivityLogUser,
        stagedCreatedBy: string | null,
        userId: string
    ): string | null {
        if (resolution !== EnumActivityLogUser.target) {
            return userId;
        }

        return stagedCreatedBy === '' ? null : stagedCreatedBy;
    }

    resolveWorkspaceId(
        resolution: EnumActivityLogWorkspace,
        stagedWorkspaceId: string | null
    ): string | null {
        if (
            resolution !== EnumActivityLogWorkspace.target ||
            stagedWorkspaceId === ''
        ) {
            return null;
        }

        return stagedWorkspaceId;
    }

    buildCreateManyUserData(
        actorId: string,
        workspaceId: string | null,
        action: EnumActivityLogAction,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        metadata: IActivityLogMetadata | null
    ): Prisma.ActivityLogCreateManyUserInput {
        const description = this.getDescription(action, metadata);
        const plainUserAgent = this.databaseUtil.toPlainObject(userAgent);
        const plainGeoLocation = this.databaseUtil.toPlainObject(geoLocation);

        return {
            workspaceId,
            action,
            description,
            ipAddress,
            userAgent: plainUserAgent,
            geoLocation: plainGeoLocation,
            ...(metadata !== null && { metadata }),
            createdBy: actorId,
        };
    }
}
