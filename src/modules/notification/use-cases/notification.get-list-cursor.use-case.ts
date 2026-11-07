import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { MessageService } from '@common/message/services/message.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import {
    NotificationDefaultAvailableOrderBy,
    NotificationSharedListCursorScope,
} from '@modules/notification/constants/notification.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationGetListCursorUseCase implements IAppUseCase<
    [string, NotificationListRequestDto],
    IResponsePaginationReturn<Notification>
> {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly messageService: MessageService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async execute(
        userId: string,
        query: NotificationListRequestDto
    ): Promise<IResponsePaginationReturn<Notification>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.NotificationWhereInput>(
                query,
                {
                    scope: NotificationSharedListCursorScope,
                    availableOrderBy: NotificationDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.notificationService.getListCursor(userId, params);
        const language = this.requestStoreService.get<string>(
            RequestLanguageStoreKey
        );

        const translated = data.map(notification => {
            const metadataProperties =
                this.notificationUtil.toMessageProperties(
                    notification.metadata
                );
            const properties = this.notificationUtil.toRejectReasonProperties(
                metadataProperties,
                language
            );
            const options = {
                ...(language !== null && { customLanguage: language }),
                properties,
            };
            const title = this.messageService.setMessage(
                notification.title,
                options
            );
            const body = this.messageService.setMessage(
                notification.body,
                options
            );

            return { ...notification, title, body };
        });

        return {
            data: translated,
            ...others,
        };
    }
}
