import { Injectable } from '@nestjs/common';
import {
    PAGINATION_MAX_PAGE,
    PAGINATION_MAX_PER_PAGE,
    PAGINATION_PAGE,
    PAGINATION_PER_PAGE,
    PAGINATION_SORT,
} from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
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

    sort(
        availableSort: string[],
        sortValue?: string
    ): Record<string, number | string> {
        if (!sortValue) {
            sortValue = PAGINATION_SORT;
        }

        const field: string = sortValue.split('@')[0];
        const type: string = sortValue.split('@')[1];
        const convertField: string = availableSort.includes(field)
            ? field
            : PAGINATION_SORT.split('@')[0];
        const convertType = ENUM_PAGINATION_SORT_TYPE[type.toUpperCase()]
            ? type.toUpperCase()
            : ENUM_PAGINATION_SORT_TYPE.ASC;

        return { [convertField]: convertType };
    }

    search(
        availableSearch: string[],
        searchValue?: string
    ): Record<string, any> | undefined {
        if (!searchValue || !availableSearch) {
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

    filterEqual<T = string>(
        field: string,
        filterValue?: T
    ): Record<string, any> | undefined {
        return filterValue ? { [field]: filterValue } : undefined;
    }

    filterContain(
        field: string,
        filterValue?: string
    ): Record<string, any> | undefined {
        return filterValue
            ? {
                  [field]: {
                      $regex: new RegExp(filterValue),
                      $options: 'i',
                  },
              }
            : undefined;
    }

    filterIn<T = string>(
        field: string,
        filterValue?: T
    ): Record<string, any> | undefined {
        return filterValue
            ? {
                  [field]: {
                      $in: filterValue,
                  },
              }
            : undefined;
    }

    filterDate(
        field: string,
        filterValue?: Date
    ): Record<string, any> | undefined {
        return filterValue
            ? {
                  [field]: filterValue,
              }
            : undefined;
    }
}
