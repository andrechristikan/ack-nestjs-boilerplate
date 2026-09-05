import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { ResponseUtil } from '@common/response/utils/response.util';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogUtil {
    constructor(
        private readonly messageService: MessageService,
        private readonly responseUtil: ResponseUtil,
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
        return {
            workspaceId,
            action,
            description: this.getDescription(action, metadata),
            ipAddress,
            userAgent: this.databaseUtil.toPlainObject(userAgent),
            geoLocation: this.databaseUtil.toPlainObject(geoLocation),
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
        return {
            data: {
                userId: actorId,
                ...this.buildCreateManyUserData(
                    actorId,
                    workspaceId,
                    action,
                    requestLog
                ),
            },
        };
    }

    mapList(activityLogs: IActivityLog[]): ActivityLogResponseDto[] {
        return this.responseUtil.serialize(
            ActivityLogResponseDto,
            activityLogs
        );
    }
}
