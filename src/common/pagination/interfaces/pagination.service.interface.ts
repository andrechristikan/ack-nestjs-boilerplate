import {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';

export interface IPaginationService {
    offset<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryOffsetParams
    ): Promise<IPaginationOffsetReturn<TReturn>>;
    cursor<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<TReturn>>;
}
