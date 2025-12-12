import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityLogUtil {
    mapList(activityLogs: IActivityLog[]): ActivityLogResponseDto[] {
        return plainToInstance(ActivityLogResponseDto, activityLogs);
    }
}
