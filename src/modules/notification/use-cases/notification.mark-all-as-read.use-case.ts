import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationMarkAllAsReadUseCase implements IAppUseCase<
    [string],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(userId: string): Promise<IResponseReturn<void>> {
        const count = await this.notificationService.markAllAsRead(userId);

        return {
            metadata: {
                messageProperties: {
                    count,
                },
            },
        };
    }
}
