import { Exclude, Expose, Transform } from 'class-transformer';
import {
    ENUM_PAGINATION_AVAILABLE_SORT_TYPE,
    PAGINATION_DEFAULT_AVAILABLE_SORT_FIELD,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
} from 'src/utils/pagination/pagination.constant';
import { IRequestSort } from '../request.interface';

export class RequestQueryBaseListValidation {
    constructor(
        defaultSort: string,
        defaultAvailableSort: string[],
        defaultPage?: number,
        defaultPerPage?: number
    ) {
        this._sort = defaultSort;
        this._availableSort = defaultAvailableSort;
        this._page = defaultPage;
        this._perPage = defaultPerPage;
    }

    @Exclude()
    readonly _sort: string;

    @Exclude()
    readonly _availableSort: string[];

    @Exclude()
    readonly _page: number;

    @Exclude()
    readonly _perPage: number;

    @Expose()
    @Transform(({ value }) => (value ? value : undefined), {
        toClassOnly: true,
    })
    readonly search?: string;

    @Expose()
    @Transform(
        ({ value, obj }) =>
            !obj._page
                ? PAGINATION_DEFAULT_PAGE
                : !value
                ? obj._page
                : value && isNaN(value)
                ? obj._page
                : parseInt(value) > PAGINATION_DEFAULT_MAX_PAGE
                ? PAGINATION_DEFAULT_MAX_PAGE
                : parseInt(value),
        { toClassOnly: true }
    )
    readonly page: number;

    @Expose()
    @Transform(
        ({ value, obj }) =>
            !obj._perPage
                ? PAGINATION_DEFAULT_PER_PAGE
                : !value
                ? obj._perPage
                : value && isNaN(value)
                ? obj._perPage
                : parseInt(value) > PAGINATION_DEFAULT_MAX_PER_PAGE
                ? PAGINATION_DEFAULT_MAX_PER_PAGE
                : parseInt(value),
        { toClassOnly: true }
    )
    readonly perPage: number;

    @Expose()
    @Transform(
        ({ value, obj }) => {
            const sortString = value ? value : obj._sort;
            const field: string = sortString.split('@')[0];
            const type: number = sortString.split('@')[1];
            const convertField: string = obj._availableSort.includes(field)
                ? field
                : PAGINATION_DEFAULT_AVAILABLE_SORT_FIELD;
            const convertType: number =
                sortString.split('@')[1] === 'desc'
                    ? ENUM_PAGINATION_AVAILABLE_SORT_TYPE.DESC
                    : ENUM_PAGINATION_AVAILABLE_SORT_TYPE.ASC;

            return {
                field,
                type,
                sort: { [convertField]: convertType },
            };
        },
        {
            toClassOnly: true,
        }
    )
    readonly sort: IRequestSort;

    @Expose()
    @Transform(({ obj }) => obj._availableSort, {
        toClassOnly: true,
    })
    readonly availableSort: string[];
}
