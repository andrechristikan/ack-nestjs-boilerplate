import { BadRequestException, Inject, Injectable, mixin } from '@nestjs/common';
import { PipeTransform, Scope, Type } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Factory function to create PaginationOffsetPipe that handles offset-based pagination
 * @param {number} defaultPerPage - Default number of items per page (default: PaginationDefaultPerPage)
 * @returns {Type<PipeTransform>} Configured pipe class for offset pagination
 *
 * @example
 * // Usage in controller
 * @Get()
 * @UsePipes(PaginationOffsetPipe(20))
 * findAll(@Query() pagination: IPaginationQueryOffsetParams) { }
 *
 * @constraint
 * - Page: minimum 1, maximum PaginationDefaultMaxPage
 * - PerPage: minimum 1, maximum PaginationDefaultMaxPerPage
 * - Default page: 1
 * - Default perPage: PaginationDefaultPerPage or custom defaultPerPage parameter
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
         * @param {number|string} value.page - Page number (validated to be between 1 and PaginationDefaultMaxPage)
         * @param {number|string} value.perPage - Items per page (validated to be between 1 and PaginationDefaultMaxPerPage)
         * @returns {IPaginationQueryOffsetParams} Transformed pagination params with limit and skip
         * @throws {UnprocessableEntityException} If page or perPage is invalid
         */
        transform(
            value: {
                page?: number | string;
                perPage?: number | string;
            } & IPaginationQueryOffsetParams
        ): IPaginationQueryOffsetParams {
            try {
                const finalPage = this.validateAndParsePage(value.page);
                const finalPerPage = this.validateAndParsePerPage(
                    value.perPage
                );

                const skip = (finalPage - 1) * finalPerPage;
                this.addToRequestInstance(finalPage, finalPerPage);

                return {
                    ...value,
                    limit: finalPerPage,
                    skip: skip,
                };
            } catch (error) {
                if (error instanceof BadRequestException) {
                    throw error;
                }

                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
                    message: 'pagination.error.invalidOffsetPaginationParams',
                });
            }
        }

        /**
         * Validates and parses page parameter
         * @param {number|string|undefined} page - Page number to validate
         * @returns {number} Validated page number
         * @throws {UnprocessableEntityException} If page is not a valid integer or out of bounds
         *
         * @constraint
         * - Must be a valid integer
         * - Must be >= 1
         * - Must be <= PaginationDefaultMaxPage
         */
        private validateAndParsePage(page?: number | string): number {
            let finalPage = page ?? 1;

            if (typeof finalPage === 'string') {
                finalPage = Number.parseInt(finalPage, 10);
            }

            if (!Number.isFinite(finalPage) || !Number.isInteger(finalPage)) {
                throw new BadRequestException({
                    statusCode: EnumPaginationStatusCodeError.invalidPage,
                    message: 'pagination.error.invalidPage',
                    messageProperties: {
                        maxPage: PaginationDefaultMaxPage,
                    },
                });
            }

            if (finalPage > PaginationDefaultMaxPage) {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.pageExceedsMaximum,
                    message: 'pagination.error.pageExceedsMaximum',
                    messageProperties: {
                        maxPage: PaginationDefaultMaxPage,
                        receivedPage: finalPage,
                    },
                });
            }

            if (finalPage < 1) {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
                    message: 'pagination.error.pageCannotBeLessThanOne',
                    messageProperties: {
                        minPage: 1,
                        receivedPage: finalPage,
                    },
                });
            }

            return finalPage;
        }

        /**
         * Validates and parses perPage parameter
         * @param {number|string|undefined} perPage - Items per page to validate
         * @returns {number} Validated perPage value
         * @throws {UnprocessableEntityException} If perPage is not a valid integer or out of bounds
         *
         * @constraint
         * - Must be a valid integer
         * - Must be >= 1
         * - Must be <= PaginationDefaultMaxPerPage
         */
        private validateAndParsePerPage(perPage?: number | string): number {
            let finalPerPage = perPage ?? defaultPerPage;

            if (typeof finalPerPage === 'string') {
                finalPerPage = Number.parseInt(finalPerPage, 10);
            }

            if (
                !Number.isFinite(finalPerPage) ||
                !Number.isInteger(finalPerPage)
            ) {
                throw new BadRequestException({
                    statusCode: EnumPaginationStatusCodeError.invalidPerPage,
                    message: 'pagination.error.invalidPerPage',
                    messageProperties: {
                        maxPerPage: PaginationDefaultMaxPerPage,
                    },
                });
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.perPageExceedsMaximum,
                    message: 'pagination.error.perPageExceedsMaximum',
                    messageProperties: {
                        maxPerPage: PaginationDefaultMaxPerPage,
                        receivedPerPage: finalPerPage,
                    },
                });
            }

            if (finalPerPage < 1) {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
                    message: 'pagination.error.perPageCannotBeLessThanOne',
                    messageProperties: {
                        minPerPage: 1,
                        receivedPerPage: finalPerPage,
                    },
                });
            }

            return finalPerPage;
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
