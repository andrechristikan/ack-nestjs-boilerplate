import { Injectable, PipeTransform, Type, mixin } from '@nestjs/common';
import {
    PaginationDefaultCursorField,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
    PaginationStoreKey,
} from '@common/pagination/constants/pagination.constant';
import {
    IPaginationCursorPipeReturn,
    IPaginationQuery,
    IPaginationSearchPipeReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';

export function PaginationCursorPipe(
    defaultPerPage: number = PaginationDefaultPerPage,
    defaultCursorField: string = PaginationDefaultCursorField
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationCursorPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

        private validatePerPage(perPage?: number | string): number {
            let finalPerPage = perPage ?? defaultPerPage;

            if (typeof finalPerPage === 'string') {
                finalPerPage = Number.parseInt(finalPerPage, 10);
            }

            if (
                !Number.isFinite(finalPerPage) ||
                !Number.isInteger(finalPerPage)
            ) {
                throw new PaginationInvalidPerPageException(
                    PaginationDefaultMaxPerPage
                );
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                throw new PaginationPerPageExceedsMaximumException(
                    PaginationDefaultMaxPerPage,
                    finalPerPage
                );
            }

            if (finalPerPage < 1) {
                throw new PaginationPerPageCannotBeLessThanOneException(
                    finalPerPage
                );
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
                throw new PaginationCursorTooLongException(
                    PaginationMaxCursorLength
                );
            }

            const urlSafeBase64Regex = /^[A-Za-z0-9_-]+$/;
            if (!urlSafeBase64Regex.test(trimmed)) {
                throw new PaginationInvalidCursorFormatException(
                    'URL-safe base64 (A-Za-z0-9_-)'
                );
            }

            return trimmed;
        }

        async transform(
            value?: IPaginationSearchPipeReturn
        ): Promise<IPaginationCursorPipeReturn> {
            try {
                const finalPerPage = this.validatePerPage(value?.perPage);
                const trimmedCursor = this.validateAndSanitizeCursor(
                    value?.cursor
                );

                this.requestStoreService.merge<IPaginationQuery>(
                    PaginationStoreKey,
                    { perPage: finalPerPage, cursor: trimmedCursor }
                );

                return {
                    where: value?.where,
                    orderBy: value?.orderBy,
                    limit: finalPerPage,
                    cursor: trimmedCursor,
                    cursorField: defaultCursorField,
                };
            } catch (error) {
                if (error instanceof AppBaseException) {
                    throw error;
                }

                throw new PaginationInvalidCursorPaginationParamsException();
            }
        }
    }

    return mixin(MixinPaginationCursorPipe);
}
