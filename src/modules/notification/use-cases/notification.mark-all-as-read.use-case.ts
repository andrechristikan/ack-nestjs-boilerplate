import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class NotificationMarkAllAsReadUseCase implements IAppUseCase<
    [IAuthJwtAccessContext],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<void>> {
        const count = await this.notificationService.markAllAsRead(
            authContext.userId
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
