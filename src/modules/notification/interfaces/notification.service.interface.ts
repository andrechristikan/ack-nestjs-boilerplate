import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import {
    INotificationNewLoginPayload,
    INotificationSendPayload,
} from '@modules/notification/interfaces/notification.interface';

export interface INotificationService {
    sendNewLogin(
        send: INotificationSendPayload,
        payload: INotificationNewLoginPayload
    ): Promise<void>;
}
