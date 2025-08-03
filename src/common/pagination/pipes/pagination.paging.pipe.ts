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
 * Creates a pagination paging pipe that validates and transforms page and perPage parameters.
 * This pipe enforces pagination limits and calculates skip values for database queries.
 *
 * @param defaultPerPage - Default number of items per page when not specified
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationPagingPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PER_PAGE
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates pagination parameters (page and perPage).
         * Enforces minimum and maximum limits, calculates skip value for database queries.
         *
         * @param value - Input object containing page, perPage and other pagination parameters
         * @returns Promise resolving to pagination query object with validated parameters
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
                limit: finalPage,
                skip: skip,
                search: value.search,
                order: value.order,
            };
        }

        /**
         * Adds pagination information to the request instance for later access.
         * Stores the page number, items per page, and skip value in the request pagination metadata.
         *
         * @param page - Current page number
         * @param perPage - Number of items per page
         * @param skip - Number of items to skip for database query
         */
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
