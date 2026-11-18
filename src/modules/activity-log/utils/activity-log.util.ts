import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    IActivityLog,
    IActivityLogActorPayload,
    IActivityLogContextPayload,
    IActivityLogMasked,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogUtil {
    constructor(
        private readonly messageService: MessageService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private toMasked(row: IActivityLog, userId: string): IActivityLogMasked {
        if (row.createdBy === userId) {
            return row;
        }

        const { metadata } = row;
        const isMetadataObject =
            typeof metadata === 'object' &&
            metadata !== null &&
            !Array.isArray(metadata);
        const hidden = {
            ipAddress: null,
            userAgent: null,
            geoLocation: null,
            createdBy: null,
        };

        if (!isMetadataObject) {
            return { ...row, ...hidden };
        }

        const { actorUserId, ...kept } = metadata;

        return { ...row, ...hidden, metadata: kept };
    }

    getDescription(
        action: EnumActivityLogAction,
        metadata: IActivityLogMetadata | null
    ): string {
        return this.messageService.setMessage(`activityLog.${action}`, {
            ...(metadata !== null && { properties: metadata }),
        });
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

    toMaskedList(rows: IActivityLog[], userId: string): IActivityLogMasked[] {
        return rows.map(row => this.toMasked(row, userId));
    }
}
