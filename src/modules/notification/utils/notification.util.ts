import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { INotification } from '@modules/notification/interfaces/notification.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class NotificationUtil {
    mapList(notifications: INotification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }
}
