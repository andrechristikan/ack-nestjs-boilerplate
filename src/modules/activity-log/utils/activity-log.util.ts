import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogUtil {
    constructor(
        private readonly messageService: MessageService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /**
     * Resolves the human-readable description from the `activityLog.<action>` i18n key, interpolating metadata.
     */
    getDescription(action: string, metadata?: IActivityLogMetadata): string {
        return this.messageService.setMessage(`activityLog.${action}`, {
            properties: metadata,
        });
    }

    buildCreateManyUserData(
        actorId: string,
        workspaceId: string | null,
        action: EnumActivityLogAction,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        metadata?: IActivityLogMetadata
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
            metadata,
            createdBy: actorId,
        };
    }

    buildCreateArgs(
        actorId: string,
        workspaceId: string,
        action: EnumActivityLogAction,
        requestLog: IRequestLog
    ): Prisma.ActivityLogCreateArgs {
        const createManyUserData = this.buildCreateManyUserData(
            actorId,
            workspaceId,
            action,
            requestLog
        );

        return {
            data: {
                userId: actorId,
                ...createManyUserData,
            },
        };
    }
}
