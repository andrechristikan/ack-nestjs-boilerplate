import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationMarkAsReadUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.markAsRead(userId, notificationId);

        return {};
    }
}
