import {
    BadRequestException,
    HttpStatus,
    Inject,
    Injectable,
    mixin,
} from '@nestjs/common';
import { PipeTransform, Scope, Type } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import {
    PaginationDefaultCursorField,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';

/**
 * Factory function to create a request-scoped NestJS pipe for cursor-based pagination.
 *
 * @param {number} [defaultPerPage=PaginationDefaultPerPage] - Default number of items per page if not provided by the client.
 * @param {string} [defaultCursorField=PaginationDefaultCursorField] - Default field to use as the cursor for pagination.
 * @returns {Type<PipeTransform>} A NestJS pipe class that parses and validates cursor pagination query parameters.
 *
 * @example
 *   @Query(new PaginationCursorPipe())
 *   async findAll(@Query() query: IPaginationQueryCursorParams) { ... }
 *
 * @constraint
 * - PerPage: minimum 1, maximum PaginationDefaultMaxPerPage
 * - Cursor: optional, maximum PaginationMaxCursorLength characters, URL-safe base64 format (A-Za-z0-9_-)
 * - Default perPage: PaginationDefaultPerPage or custom defaultPerPage parameter
 * - Default cursor: undefined
 * - Default cursorField: PaginationDefaultCursorField or custom defaultCursorField parameter
 */
export function PaginationCursorPipe(
    defaultPerPage: number = PaginationDefaultPerPage,
    defaultCursorField: string = PaginationDefaultCursorField
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationCursorPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates the incoming pagination query parameters for cursor-based pagination.
         *
         * @param {Object} value - The input object containing pagination parameters.
         * @param {string} [value.cursor] - The cursor value for pagination (optional).
         * @param {number|string} [value.perPage] - The number of items per page (optional).
         * @returns {Promise<IPaginationQueryCursorParams>} The validated and normalized cursor pagination parameters.
         * @throws {UnprocessableEntityException} If any parameter is invalid.
         */
        async transform(
            value: {
                cursor?: string;
                perPage?: number | string;
            } & IPaginationQueryCursorParams
        ): Promise<IPaginationQueryCursorParams> {
            try {
                const finalPerPage = this.validatePerPage(value.perPage);
                const trimmedCursor = this.validateAndSanitizeCursor(
                    value.cursor
                );

                this.addToRequestInstance(finalPerPage, trimmedCursor);

                return {
                    ...value,
                    limit: finalPerPage,
                    cursor: trimmedCursor,
                    cursorField: defaultCursorField,
                };
            } catch (error) {
                if (error instanceof BadRequestException) {
                    throw error;
                }

                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    message: 'pagination.error.invalidCursorPaginationParams',
                });
            }
        }

        /**
         * Validates and normalizes the perPage parameter.
         * Ensures it is a positive integer and does not exceed the maximum allowed.
         * Throws explicit error for invalid values (consistent with OffsetPipe).
         *
         * @param {number|string} [perPage] - The requested number of items per page.
         * @returns {number} The validated perPage value.
         * @throws {UnprocessableEntityException} If perPage is not a valid integer or out of range.
         *
         * @constraint
         * - Must be a valid integer
         * - Must be >= 1
         * - Must be <= PaginationDefaultMaxPerPage
         */
        private validatePerPage(perPage?: number | string): number {
            let finalPerPage = perPage ?? defaultPerPage;

            if (typeof finalPerPage === 'string') {
                finalPerPage = Number.parseInt(finalPerPage, 10);
            }

            if (
                !Number.isFinite(finalPerPage) ||
                !Number.isInteger(finalPerPage)
            ) {
                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    message: 'pagination.error.invalidPerPage',
                    messageProperties: {
                        maxPerPage: PaginationDefaultMaxPerPage,
                    },
                });
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    message: 'pagination.error.perPageExceedsMaximum',
                    messageProperties: {
                        maxPerPage: PaginationDefaultMaxPerPage,
                        receivedPerPage: finalPerPage,
                    },
                });
            }

            if (finalPerPage < 1) {
                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
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
         * Validates and sanitizes the cursor parameter.
         * Trims whitespace, checks length, and ensures URL-safe base64 format (A-Za-z0-9_-).
         *
         * Cursor encoding uses: Buffer.from(data).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
         * Which produces URL-safe base64 without padding.
         *
         * @param {string} [cursor] - The cursor value to validate.
         * @returns {string|undefined} The sanitized cursor or undefined if not provided.
         * @throws {UnprocessableEntityException} If the cursor is too long or has an invalid format.
         *
         * @constraint
         * - Optional parameter
         * - Maximum length: PaginationMaxCursorLength
         * - Format: URL-safe base64 (A-Za-z0-9_-) without padding
         * - Returns undefined if cursor is empty string after trimming
         */
        private validateAndSanitizeCursor(cursor?: string): string | undefined {
            if (typeof cursor !== 'string') {
                return undefined;
            }

            const trimmed = cursor.trim();

            if (trimmed === '') {
                return undefined;
            }

            if (trimmed.length > PaginationMaxCursorLength) {
                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    message: 'pagination.error.cursorTooLong',
                    messageProperties: {
                        maxCursorLength: PaginationMaxCursorLength,
                    },
                });
            }

            // URL-safe base64 format: A-Za-z0-9_- (no padding = removed)
            // Using + instead of * to require at least 1 character
            const urlSafeBase64Regex = /^[A-Za-z0-9_-]+$/;
            if (!urlSafeBase64Regex.test(trimmed)) {
                throw new BadRequestException({
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    message: 'pagination.error.invalidCursorFormat',
                    messageProperties: {
                        format: 'URL-safe base64 (A-Za-z0-9_-)',
                    },
                });
            }

            return trimmed;
        }

        /**
         * Adds cursor pagination information to the request instance for downstream access.
         *
         * @param {number} perPage - The number of items per page.
         * @param {string} [cursor] - The cursor value for pagination.
         * @private
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
