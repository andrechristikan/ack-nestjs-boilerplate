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
 *
 * This factory function creates a dynamically scoped pipe that validates and enforces
 * pagination limits for page numbers and items per page. It automatically calculates
 * the skip value needed for database queries and stores pagination metadata in the request context.
 * The pipe ensures that pagination parameters are within acceptable bounds and provides
 * fallback values when parameters are invalid or missing.
 *
 * @param defaultPerPage - Default number of items per page when perPage is not specified
 *                        or is invalid. Defaults to PAGINATION_DEFAULT_PER_PAGE constant.
 *                        Must be a positive number within the allowed limits.
 *
 * @returns A dynamically created pipe class that implements PipeTransform interface.
 *         The returned class is request-scoped and has access to the current request context.
 */
export function PaginationPagingPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PER_PAGE
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates pagination parameters from the query string.
         *
         * This method processes page and perPage parameters, enforcing minimum and maximum
         * limits defined by the pagination constants. It ensures that page numbers are
         * within valid bounds and perPage values don't exceed system limits. The method
         * calculates the skip value needed for database offset operations and stores
         * all pagination metadata in the request context for later access.
         *
         * @param value - Input object containing pagination parameters including:
         *               - page: Optional page number (1-based). Can be number or string.
         *               - perPage: Optional items per page count. Can be number or string.
         *               - Other pagination parameters that will be passed through.
         *
         * @returns Promise resolving to pagination query object with validated and transformed
         *         parameters. The returned object includes:
         *         - limit: Validated perPage value for database queries
         *         - skip: Calculated offset value for database pagination
         *         - All original parameters from the input value
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

        /**
         * Adds pagination information to the request instance for later access.
         *
         * Stores the validated pagination parameters in the request's pagination metadata
         * object (__pagination). This allows other parts of the application to access
         * the pagination information without having to re-validate or re-calculate the values.
         * The information is stored in the request scope and is available throughout
         * the request lifecycle for logging, response headers, or other processing needs.
         *
         * @param page - The validated and bounded page number (1-based indexing).
         *              This value has been enforced to be within PAGINATION_DEFAULT_MAX_PAGE limits.
         * @param perPage - The validated number of items per page.
         *                 This value has been enforced to be within PAGINATION_DEFAULT_MAX_PER_PAGE limits.
         * @param skip - The calculated number of items to skip for database offset queries.
         *              Computed as (page - 1) * perPage for proper database pagination.
         *
         * @returns void - This method modifies the request object in place.
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
