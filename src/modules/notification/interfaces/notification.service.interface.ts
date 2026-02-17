import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';

export interface INotificationService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
    ): Promise<IResponsePagingReturn<NotificationResponseDto>>;
}
