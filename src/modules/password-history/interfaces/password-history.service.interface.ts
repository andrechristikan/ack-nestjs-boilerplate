import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';

export interface IPasswordHistoryService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
}
