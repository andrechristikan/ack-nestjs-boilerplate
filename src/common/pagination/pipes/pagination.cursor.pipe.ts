import {
    Inject,
    Injectable,
    UnprocessableEntityException,
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
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Request-scoped pipe parsing and validating cursor pagination query params.
 */
export function PaginationCursorPipe(
    defaultPerPage: number = PaginationDefaultPerPage,
    defaultCursorField: string = PaginationDefaultCursorField
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationCursorPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

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
                if (error instanceof UnprocessableEntityException) {
                    throw error;
                }

                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.invalidCursorPaginationParams,
                    message: 'pagination.error.invalidCursorPaginationParams',
                });
            }
        }

        private validatePerPage(perPage?: number | string): number {
            let finalPerPage = perPage ?? defaultPerPage;

            if (typeof finalPerPage === 'string') {
                finalPerPage = Number.parseInt(finalPerPage, 10);
            }

            if (
                !Number.isFinite(finalPerPage) ||
                !Number.isInteger(finalPerPage)
            ) {
                throw new UnprocessableEntityException({
                    statusCode: EnumPaginationStatusCodeError.invalidPerPage,
                    message: 'pagination.error.invalidPerPage',
                    messageProperties: {
                        maxPerPage: PaginationDefaultMaxPerPage,
                    },
                });
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                throw new UnprocessableEntityException({
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
                throw new UnprocessableEntityException({
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
         * Trims and validates the cursor: max length and URL-safe base64 format (no padding).
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
                throw new UnprocessableEntityException({
                    statusCode: EnumPaginationStatusCodeError.cursorTooLong,
                    message: 'pagination.error.cursorTooLong',
                    messageProperties: {
                        maxCursorLength: PaginationMaxCursorLength,
                    },
                });
            }

            const urlSafeBase64Regex = /^[A-Za-z0-9_-]+$/;
            if (!urlSafeBase64Regex.test(trimmed)) {
                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.invalidCursorFormat,
                    message: 'pagination.error.invalidCursorFormat',
                    messageProperties: {
                        format: 'URL-safe base64 (A-Za-z0-9_-)',
                    },
                });
            }

            return trimmed;
        }

        private addToRequestInstance(perPage: number, cursor?: string): void {
            this.request.pagination = {
                ...this.request.pagination,
                perPage,
                cursor,
            };
        }
    }

    return mixin(MixinPaginationCursorPipe);
}
