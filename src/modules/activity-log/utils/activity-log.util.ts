import { MessageService } from '@common/message/services/message.service';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityLogUtil {
    constructor(private readonly messageService: MessageService) {}

    getDescription(action: string, metadata?: IActivityLogMetadata): string {
        return this.messageService.setMessage(
            `activityLog.${action}`,
            metadata
        );
    }

    mapList(activityLogs: IActivityLog[]): ActivityLogResponseDto[] {
        return plainToInstance(ActivityLogResponseDto, activityLogs);
    }
}
