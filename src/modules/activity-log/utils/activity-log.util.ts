import { MessageService } from '@common/message/services/message.service';
import { ResponseUtil } from '@common/response/utils/response.util';
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
        private readonly responseUtil: ResponseUtil
    ) {}

    /**
     * Resolves the human-readable description from the `activityLog.<action>` i18n key, interpolating metadata.
     */
    getDescription(action: string, metadata?: IActivityLogMetadata): string {
        return this.messageService.setMessage(
            `activityLog.${action}`,
            metadata
        );
    }

    mapList(activityLogs: IActivityLog[]): ActivityLogResponseDto[] {
        return this.responseUtil.serialize(
            ActivityLogResponseDto,
            activityLogs
        );
    }
}
