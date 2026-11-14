import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class NotificationMarkAsReadUseCase implements IAppUseCase<
    [IAuthJwtAccessContext, string],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        authContext: IAuthJwtAccessContext,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.markAsRead(
            authContext.userId,
            notificationId
        );

        return {};
    }
}
