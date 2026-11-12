import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationMarkAllAsReadUseCase implements IAppUseCase<
    [IRequestContextUser],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        context: IRequestContextUser
    ): Promise<IResponseReturn<void>> {
        const count = await this.notificationService.markAllAsRead(
            context.user.id
        );

        return {
            metadata: {
                messageProperties: {
                    count,
                },
            },
        };
    }
}
