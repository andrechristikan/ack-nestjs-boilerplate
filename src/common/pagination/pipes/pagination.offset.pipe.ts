import { Inject, Injectable, mixin } from '@nestjs/common';
import { PipeTransform, Scope, Type } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';

/**
 * Factory function to create PaginationOffsetPipe that handles offset-based pagination
 * @param {number} defaultPerPage - Default number of items per page
 * @returns {Type<PipeTransform>} Configured pipe class for offset pagination
 */
export function PaginationOffsetPipe(
    defaultPerPage: number = PaginationDefaultPerPage
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOffsetPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms input value to add offset pagination functionality with validation and limits
         * @param {Object} value - Input object containing pagination parameters
         * @param {number|string} value.page - Page number (will be normalized to valid range)
         * @param {number|string} value.perPage - Items per page (will be normalized to valid range)
         * @returns {Promise<IPaginationQueryOffsetParams>} Transformed pagination params with limit and skip
         */
        async transform(
            value: {
                page?: number | string;
                perPage?: number | string;
            } & IPaginationQueryOffsetParams
        ): Promise<IPaginationQueryOffsetParams> {
            let finalPage = Number(value.page) ?? 1;
            let finalPerPage = Number(value.perPage) ?? defaultPerPage;

            if (finalPage > PaginationDefaultMaxPage) {
                finalPage = PaginationDefaultMaxPage;
            } else if (finalPage < 1) {
                finalPage = 1;
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                finalPerPage = PaginationDefaultMaxPerPage;
            } else if (finalPerPage < 1) {
                finalPerPage = defaultPerPage;
            }

            const skip = (finalPage - 1) * finalPerPage;
            this.addToRequestInstance(finalPage, finalPerPage);

            return {
                ...value,
                limit: finalPerPage,
                skip: skip,
            };
        }

        /**
         * Adds pagination information to request instance
         * @param {number} page - Current page number
         * @param {number} perPage - Items per page
         * @returns {void}
         */
        private addToRequestInstance(page: number, perPage: number): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                page,
                perPage,
            };
        }
    }

    return mixin(MixinPaginationOffsetPipe);
}
