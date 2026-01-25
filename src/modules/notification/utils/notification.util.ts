import { Notification } from '@generated/prisma-client';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class NotificationUtil {
    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }

    // TODO: NEXT
}
