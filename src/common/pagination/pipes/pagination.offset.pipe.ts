import {
    Inject,
    Injectable,
    UnprocessableEntityException,
    mixin,
} from '@nestjs/common';
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
 * Request-scoped pipe parsing and validating offset pagination (page, perPage) into limit/skip.
 */
export function PaginationOffsetPipe(
    defaultPerPage: number = PaginationDefaultPerPage
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOffsetPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

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
                if (error instanceof UnprocessableEntityException) {
                    throw error;
                }

                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
                    message: 'pagination.error.invalidOffsetPaginationParams',
                });
            }
        }

        private validateAndParsePage(page?: number | string): number {
            let finalPage = page ?? 1;

            if (typeof finalPage === 'string') {
                finalPage = Number.parseInt(finalPage, 10);
            }

            if (!Number.isFinite(finalPage) || !Number.isInteger(finalPage)) {
                throw new UnprocessableEntityException({
                    statusCode: EnumPaginationStatusCodeError.invalidPage,
                    message: 'pagination.error.invalidPage',
                    messageProperties: {
                        maxPage: PaginationDefaultMaxPage,
                    },
                });
            }

            if (finalPage > PaginationDefaultMaxPage) {
                throw new UnprocessableEntityException({
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
                throw new UnprocessableEntityException({
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

        private validateAndParsePerPage(perPage?: number | string): number {
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

        private addToRequestInstance(page: number, perPage: number): void {
            this.request.pagination = {
                ...this.request.pagination,
                page,
                perPage,
            };
        }
    }

    return mixin(MixinPaginationOffsetPipe);
}
