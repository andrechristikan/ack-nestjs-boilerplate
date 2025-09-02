import { Inject, Injectable, mixin } from '@nestjs/common';
import { PipeTransform, Scope, Type } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import {
    PAGINATION_DEFAULT_CURSOR_FIELD,
    PAGINATION_DEFAULT_PER_PAGE,
} from '@common/pagination/constants/pagination.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';

/**
 * Factory function to create PaginationCursorPipe that handles cursor-based pagination
 * @param {number} defaultPerPage - Default number of items per page
 * @param {string} defaultCursorField - Default field to use as cursor
 * @returns {Type<PipeTransform>} Configured pipe class for cursor pagination
 */
export function PaginationCursorPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PER_PAGE,
    defaultCursorField: string = PAGINATION_DEFAULT_CURSOR_FIELD
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationCursorPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms input value to add cursor pagination functionality
         * @param {Object} value - Input object containing pagination parameters
         * @param {string} value.cursor - Cursor value for pagination
         * @param {number|string} value.perPage - Items per page
         * @returns {Promise<IPaginationQueryCursorParams>} Transformed cursor pagination params
         */
        async transform(
            value: {
                cursor?: string;
                perPage?: number | string;
            } & IPaginationQueryCursorParams
        ): Promise<IPaginationQueryCursorParams> {
            const finalPerPage =
                Number.parseInt(value.perPage?.toString()) ?? defaultPerPage;
            this.addToRequestInstance(finalPerPage, value.cursor);

            return {
                ...value,
                limit: finalPerPage,
                cursor: value.cursor,
                cursorField: defaultCursorField,
            };
        }

        /**
         * Adds cursor pagination information to request instance
         * @param {number} perPage - Items per page
         * @param {string} cursor - Cursor value for pagination
         * @returns {void}
         */
        private addToRequestInstance(perPage: number, cursor?: string): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                perPage,
                cursor,
            };
        }
    }

    return mixin(MixinPaginationCursorPipe);
}
