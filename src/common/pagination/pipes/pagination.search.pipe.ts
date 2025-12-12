import { Inject, Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';

/**
 * Factory function to create PaginationSearchPipe that can perform search on available fields
 * @param {string[]} availableSearch - Array of searchable fields
 * @returns {Type<PipeTransform>} Configured pipe class for searching
 */
export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms input value to add search functionality
         * @param {Object} value - Input object containing search string and pagination params
         * @param {string} value.search - Search string
         * @returns {Promise<IPaginationQueryOffsetParams | IPaginationQueryCursorParams>} Transformed pagination params
         */
        async transform(
            value: { search: string } & (
                | IPaginationQueryOffsetParams
                | IPaginationQueryCursorParams
            )
        ): Promise<
            IPaginationQueryOffsetParams | IPaginationQueryCursorParams
        > {
            if (!value || !value?.search || availableSearch.length === 0) {
                return value;
            }

            const finalSearch = value.search?.trim();
            this.addToRequestInstance(finalSearch, availableSearch);

            return {
                ...value,
                where: this.buildSearchObject(finalSearch, availableSearch),
            };
        }

        /**
         * Builds search object for database query
         * @param {string} search - Search string
         * @param {string[]} availableSearch - Array of searchable fields
         * @returns {{ or: Record<string, { contains: string }>[] }} Query object for search
         */
        private buildSearchObject(
            search: string,
            availableSearch: string[]
        ): { or: Record<string, { contains: string }>[] } {
            return {
                or: availableSearch.map(field => ({
                    [field]: { contains: search },
                })),
            };
        }

        /**
         * Adds search information to request instance
         * @param {string} search - Search string
         * @param {string[]} availableSearch - Array of searchable fields
         * @returns {void}
         */
        private addToRequestInstance(
            search: string,
            availableSearch: string[]
        ): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                search,
                availableSearch,
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
