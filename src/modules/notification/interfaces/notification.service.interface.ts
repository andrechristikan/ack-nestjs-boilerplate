import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';

export interface INotificationService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<NotificationResponseDto>>;
}
