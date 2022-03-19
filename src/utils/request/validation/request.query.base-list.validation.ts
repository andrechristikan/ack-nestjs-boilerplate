import { Exclude, Expose, Transform } from 'class-transformer';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE,
} from 'src/utils/pagination/pagination.constant';

export class RequestQueryBaseListValidation {
    constructor(
        defaultSort: string,
        defaultPage?: number,
        defaultPerPage?: number
    ) {
        this._sort = defaultSort;
        this._page = defaultPage;
        this._perPage = defaultPerPage;
    }

    @Exclude()
    readonly _sort: string;

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
                ? DEFAULT_PAGE
                : !value
                ? obj._page
                : value && isNaN(value)
                ? obj._page
                : parseInt(value),
        { toClassOnly: true }
    )
    readonly page: number;

    @Expose()
    @Transform(
        ({ value, obj }) =>
            !obj._perPage
                ? DEFAULT_PER_PAGE
                : !value
                ? obj._perPage
                : value && isNaN(value)
                ? obj._perPage
                : parseInt(value),
        { toClassOnly: true }
    )
    readonly perPage: number;

    @Expose()
    @Transform(
        ({ value, obj }) => {
            if (!value) {
                value = obj._sort;
            }

            const fieldSort: string = value.split('@')[0];
            const typeSort: number = value.split('@')[1] === 'desc' ? -1 : 1;

            return { [fieldSort]: typeSort };
        },
        {
            toClassOnly: true,
        }
    )
    readonly sort: Record<string, any>;
}
