import { Inject, Injectable, mixin } from '@nestjs/common';
import { PipeTransform, Scope, Type } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import {
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
    PAGINATION_DEFAULT_PER_PAGE,
} from '@common/pagination/constants/pagination.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';

/**
 * Creates a pipe that validates and transforms pagination paging parameters (page and perPage)
 * @param {number} [defaultPerPage] - Default number of items per page, defaults to PAGINATION_DEFAULT_PER_PAGE
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for pagination paging validation and transformation
 */
export function PaginationPagingPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PER_PAGE
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms pagination query object with paging parameters and calculates skip value
         * @param {object} value - Pagination query object containing page, perPage and other pagination properties
         * @param {number|string} [value.page] - Page number to retrieve
         * @param {number|string} [value.perPage] - Number of items per page
         * @returns {Promise<IPaginationQueryReturn>} Transformed pagination query object with limit and skip values
         */
        async transform(
            value: {
                page?: number | string;
                perPage?: number | string;
            } & IPaginationQueryReturn
        ): Promise<IPaginationQueryReturn> {
            let finalPage = Number(value.page) ?? 1;
            let finalPerPage = Number(value.perPage) ?? defaultPerPage;

            if (finalPage > PAGINATION_DEFAULT_MAX_PAGE) {
                finalPage = PAGINATION_DEFAULT_MAX_PAGE;
            } else if (finalPage < 1) {
                finalPage = 1;
            }

            if (finalPerPage > PAGINATION_DEFAULT_MAX_PER_PAGE) {
                finalPerPage = PAGINATION_DEFAULT_MAX_PER_PAGE;
            } else if (finalPerPage < 1) {
                finalPerPage = defaultPerPage;
            }

            const skip = (finalPage - 1) * finalPerPage;
            this.addToRequestInstance(finalPage, finalPerPage, skip);

            return {
                ...value,
                limit: finalPerPage,
                skip: skip,
            };
        }

        addToRequestInstance(
            page: number,
            perPage: number,
            skip: number
        ): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                page,
                perPage,
                skip,
            };
        }
    }

    return mixin(MixinPaginationPagingPipe);
}
