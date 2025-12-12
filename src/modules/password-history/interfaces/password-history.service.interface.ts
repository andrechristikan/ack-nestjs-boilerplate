import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';

export interface IPasswordHistoryService {
    getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
    getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
}
