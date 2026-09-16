import {
    IPaginationCursorArgs,
    IPaginationCursorReturn,
    IPaginationOffsetArgs,
    IPaginationOffsetReturn,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';

export interface IPaginationService {
    offset<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationOffsetArgs
    ): Promise<IPaginationOffsetReturn<TReturn>>;
    cursor<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationCursorArgs
    ): Promise<IPaginationCursorReturn<TReturn>>;
}
