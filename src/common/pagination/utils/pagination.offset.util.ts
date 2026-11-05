import { PaginationDefaultMaxPage } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import type {
    IPaginationOffsetReturn,
    IPaginationPageException,
} from '@common/pagination/interfaces/pagination.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaginationOffsetUtil {
    page<TReturn>(
        items: TReturn[],
        count: number,
        params: { skip: number; limit: number }
    ): IPaginationOffsetReturn<TReturn> {
        const { skip, limit } = params;
        const currentPage = Math.floor(skip / limit) + 1;
        const totalPage = Math.ceil(count / limit);
        const hasNext = currentPage < totalPage;
        const hasPrevious = currentPage > 1;
        const nextPage = hasNext ? currentPage + 1 : null;
        const previousPage = hasPrevious ? currentPage - 1 : null;

        return {
            type: EnumPaginationType.offset,
            count,
            perPage: limit,
            page: currentPage,
            totalPage,
            hasNext,
            hasPrevious,
            data: items,
            ...(nextPage && { nextPage }),
            ...(previousPage && { previousPage }),
        };
    }

    skip(page: number, perPage: number): number {
        return (page - 1) * perPage;
    }

    parsePage(page: number | string | null): number | IPaginationPageException {
        let finalPage = page ?? 1;

        if (typeof finalPage === 'string') {
            finalPage = Number.parseInt(finalPage, 10);
        }

        if (!Number.isFinite(finalPage) || !Number.isInteger(finalPage)) {
            return new PaginationInvalidPageException(PaginationDefaultMaxPage);
        }

        if (finalPage > PaginationDefaultMaxPage) {
            return new PaginationPageExceedsMaximumException(
                PaginationDefaultMaxPage,
                finalPage
            );
        }

        if (finalPage < 1) {
            return new PaginationPageCannotBeLessThanOneException(finalPage);
        }

        return finalPage;
    }
}
