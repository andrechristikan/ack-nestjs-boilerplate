import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationMarkAsReadUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        context: IRequestContextUser,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.markAsRead(
            context.user.id,
            notificationId
        );

        return {};
    }
}
