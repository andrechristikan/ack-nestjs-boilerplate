import {
    Injectable,
    mixin,
} from '@nestjs/common';
import { PipeTransform, Type } from '@nestjs/common/interfaces';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
    PaginationStoreKey,
} from '@common/pagination/constants/pagination.constant';
import {
    IPaginationQuery,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { PaginationInvalidOffsetPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-offset-pagination-params.exception';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';

export function PaginationOffsetPipe(
    defaultPerPage: number = PaginationDefaultPerPage
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationOffsetPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

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
                this.requestStoreService.merge<IPaginationQuery>(
                    PaginationStoreKey,
                    { page: finalPage, perPage: finalPerPage }
                );

                return {
                    ...value,
                    limit: finalPerPage,
                    skip: skip,
                };
            } catch (error) {
                if (error instanceof AppBaseException) {
                    throw error;
                }

                throw new PaginationInvalidOffsetPaginationParamsException();
            }
        }

        private validateAndParsePage(page?: number | string): number {
            let finalPage = page ?? 1;

            if (typeof finalPage === 'string') {
                finalPage = Number.parseInt(finalPage, 10);
            }

            if (!Number.isFinite(finalPage) || !Number.isInteger(finalPage)) {
                throw new PaginationInvalidPageException(PaginationDefaultMaxPage);
            }

            if (finalPage > PaginationDefaultMaxPage) {
                throw new PaginationPageExceedsMaximumException(PaginationDefaultMaxPage, finalPage);
            }

            if (finalPage < 1) {
                throw new PaginationPageCannotBeLessThanOneException(finalPage);
            }

            return finalPage;
        }

        private validateAndParsePerPage(perPage?: number | string): number {
            let finalPerPage = perPage ?? defaultPerPage;

            if (typeof finalPerPage === 'string') {
                finalPerPage = Number.parseInt(finalPerPage, 10);
            }

            if (
                !Number.isFinite(finalPerPage) ||
                !Number.isInteger(finalPerPage)
            ) {
                throw new PaginationInvalidPerPageException(PaginationDefaultMaxPerPage);
            }

            if (finalPerPage > PaginationDefaultMaxPerPage) {
                throw new PaginationPerPageExceedsMaximumException(PaginationDefaultMaxPerPage, finalPerPage);
            }

            if (finalPerPage < 1) {
                throw new PaginationPerPageCannotBeLessThanOneException(finalPerPage);
            }

            return finalPerPage;
        }
    }

    return mixin(MixinPaginationOffsetPipe);
}
