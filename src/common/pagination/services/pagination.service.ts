import { Injectable } from '@nestjs/common';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    PAGINATION_DEFAULT_AVAILABLE_ORDER_BY,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_ORDER_BY,
    PAGINATION_DEFAULT_ORDER_DIRECTION,
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
} from 'src/common/pagination/constants/pagination.constant';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { IPaginationService } from 'src/common/pagination/interfaces/pagination.service.interface';

@Injectable()
export class PaginationService implements IPaginationService {
    offset(page: number, perPage: number): number {
        page =
            page > PAGINATION_DEFAULT_MAX_PAGE
                ? PAGINATION_DEFAULT_MAX_PAGE
                : page;
        perPage =
            perPage > PAGINATION_DEFAULT_MAX_PER_PAGE
                ? PAGINATION_DEFAULT_MAX_PER_PAGE
                : perPage;
        const offset: number = (page - 1) * perPage;

        return offset;
    }

    totalPage(totalData: number, perPage: number): number {
        let totalPage = Math.ceil(totalData / perPage);
        totalPage = totalPage === 0 ? 1 : totalPage;
        return totalPage > PAGINATION_DEFAULT_MAX_PAGE
            ? PAGINATION_DEFAULT_MAX_PAGE
            : totalPage;
    }

    page(page?: number): number {
        return page
            ? page > PAGINATION_DEFAULT_MAX_PAGE
                ? PAGINATION_DEFAULT_MAX_PAGE
                : page
            : PAGINATION_DEFAULT_PAGE;
    }

    perPage(perPage?: number): number {
        return perPage
            ? perPage > PAGINATION_DEFAULT_MAX_PER_PAGE
                ? PAGINATION_DEFAULT_MAX_PER_PAGE
                : perPage
            : PAGINATION_DEFAULT_PER_PAGE;
    }

    order(
        orderByValue = PAGINATION_DEFAULT_ORDER_BY,
        orderDirectionValue = PAGINATION_DEFAULT_ORDER_DIRECTION,
        availableOrderBy = PAGINATION_DEFAULT_AVAILABLE_ORDER_BY
    ): IPaginationOrder {
        const orderBy: string = availableOrderBy.includes(orderByValue)
            ? orderByValue
            : PAGINATION_DEFAULT_ORDER_BY;

        return { [orderBy]: orderDirectionValue };
    }

    search(
        searchValue: string,
        availableSearch: string[]
    ): Record<string, any> {
        if (
            !searchValue ||
            searchValue === '' ||
            availableSearch.length === 0
        ) {
            return;
        }

        return {
            $or: availableSearch.map(val =>
                DatabaseHelperQueryContain(val, searchValue)
            ),
        };
    }
}
