import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';

export class RequestPaginationSerialization {
    search: string;
    filters: Record<
        string,
        string | number | boolean | Array<string | number | boolean>
    >;
    page: number;
    perPage: number;
    orderBy: string;
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
    availableSearch: string[];
    availableOrderBy: string[];
    availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];
}
