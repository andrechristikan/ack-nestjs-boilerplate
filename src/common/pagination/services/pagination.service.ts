import { Injectable } from '@nestjs/common';
import {
    PAGINATION_AVAILABLE_ORDER_BY,
    PAGINATION_MAX_PAGE,
    PAGINATION_MAX_PER_PAGE,
    PAGINATION_ORDER_BY,
    PAGINATION_ORDER_DIRECTION,
    PAGINATION_PAGE,
    PAGINATION_PER_PAGE,
} from 'src/common/pagination/constants/pagination.constant';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { IPaginationService } from 'src/common/pagination/interfaces/pagination.service.interface';

@Injectable()
export class PaginationService implements IPaginationService {
    offset(page: number, perPage: number): number {
        page = page > PAGINATION_MAX_PAGE ? PAGINATION_MAX_PAGE : page;
        perPage =
            perPage > PAGINATION_MAX_PER_PAGE
                ? PAGINATION_MAX_PER_PAGE
                : perPage;
        const offset: number = (page - 1) * perPage;

        return offset;
    }

    totalPage(totalData: number, perPage: number): number {
        let totalPage = Math.ceil(totalData / perPage);
        totalPage = totalPage === 0 ? 1 : totalPage;
        return totalPage > PAGINATION_MAX_PAGE
            ? PAGINATION_MAX_PAGE
            : totalPage;
    }

    offsetWithoutMax(page: number, perPage: number): number {
        const offset: number = (page - 1) * perPage;
        return offset;
    }

    totalPageWithoutMax(totalData: number, perPage: number): number {
        let totalPage = Math.ceil(totalData / perPage);
        totalPage = totalPage === 0 ? 1 : totalPage;
        return totalPage;
    }

    page(page?: number): number {
        return page
            ? page > PAGINATION_MAX_PAGE
                ? PAGINATION_MAX_PAGE
                : page
            : PAGINATION_PAGE;
    }

    perPage(perPage?: number): number {
        return perPage
            ? perPage > PAGINATION_MAX_PER_PAGE
                ? PAGINATION_MAX_PER_PAGE
                : perPage
            : PAGINATION_PER_PAGE;
    }

    order(
        orderByValue = PAGINATION_ORDER_BY,
        orderDirectionValue = PAGINATION_ORDER_DIRECTION,
        availableOrderBy = PAGINATION_AVAILABLE_ORDER_BY
    ): IPaginationOrder {
        const orderBy: string = availableOrderBy.includes(orderByValue)
            ? orderByValue
            : PAGINATION_ORDER_BY;

        return { [orderBy]: orderDirectionValue };
    }

    search(
        searchValue = '',
        availableSearch: string[]
    ): Record<string, any> | undefined {
        if (!searchValue) {
            return undefined;
        }

        return {
            $or: availableSearch.map((val) => ({
                [val]: {
                    $regex: new RegExp(searchValue),
                    $options: 'i',
                },
            })),
        };
    }

    filterEqual<T = string>(field: string, filterValue: T): Record<string, T> {
        return { [field]: filterValue };
    }

    filterContain(
        field: string,
        filterValue: string
    ): Record<string, { $regex: RegExp; $options: string }> {
        return {
            [field]: {
                $regex: new RegExp(filterValue),
                $options: 'i',
            },
        };
    }

    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, { $regex: RegExp; $options: string }> {
        return {
            [field]: {
                $regex: new RegExp(`\\b${filterValue}\\b`),
                $options: 'i',
            },
        };
    }

    filterIn<T = string>(
        field: string,
        filterValue: T[]
    ): Record<string, { $in: T[] }> {
        return {
            [field]: {
                $in: filterValue,
            },
        };
    }

    filterDate(field: string, filterValue: Date): Record<string, Date> {
        return {
            [field]: filterValue,
        };
    }
}
