import { Injectable } from '@nestjs/common';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    PaginationAllowedOrderDirections,
    PaginationDefaultCursorField,
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';
import { PaginationFilterInvalidValueException } from '@common/pagination/exceptions/pagination.filter-invalid-value.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidOffsetPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-offset-pagination-params.exception';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import type {
    IPaginationCursorQueryDto,
    IPaginationDate,
    IPaginationEqual,
    IPaginationIn,
    IPaginationNin,
    IPaginationNotEqual,
    IPaginationOffsetQueryDto,
    IPaginationOrderBy,
    IPaginationQuery,
    IPaginationQueryCursorOptions,
    IPaginationQueryCursorParams,
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEqualOptions,
    IPaginationQueryFilterOptions,
    IPaginationQueryFilterResult,
    IPaginationQueryOffsetOptions,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { Prisma } from '@generated/prisma-client/client';

/**
 * Pure pagination query parse — no `RequestStoreService`. HTTP services merge `storePatch`.
 */
@Injectable()
export class PaginationQueryUtil {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService
    ) {}

    private equal<TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        options?: IPaginationQueryFilterEqualOptions
    ): IPaginationQueryFilterResult | undefined {
        if (typeof value !== 'string' || value.trim() === '') {
            return undefined;
        }

        const finalValue = this.coerceEqualValue(field, value, options);
        const customField = options?.customField ?? field;

        return {
            where: {
                [customField]: {
                    equals: finalValue,
                },
            },
            storeFilter: { [field]: finalValue },
        };
    }

    private coerceEqualValue(
        field: string,
        value: string,
        options?: IPaginationQueryFilterEqualOptions
    ): string | number | boolean {
        if (options && 'isBoolean' in options && options.isBoolean) {
            const booleanString = value.trim();
            if (booleanString !== 'true' && booleanString !== 'false') {
                throw new PaginationFilterInvalidValueException(field);
            }

            return booleanString === 'true';
        }

        if (options && 'isNumber' in options && options.isNumber) {
            const parsed = Number.parseFloat(value.trim());
            if (Number.isNaN(parsed)) {
                throw new PaginationFilterInvalidValueException(field);
            }

            return parsed;
        }

        return value.trim();
    }

    private enumFilter<T, TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        defaultEnum: T[],
        operator: 'in' | 'notIn',
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult | undefined {
        if (
            typeof value !== 'string' ||
            value.trim() === '' ||
            !defaultEnum ||
            defaultEnum.length === 0
        ) {
            return undefined;
        }

        const finalValue = this.helperArrayService.unique(
            value
                .split(',')
                .map(entry => entry.trim())
                .filter(entry => entry !== '')
        );

        if (finalValue.length === 0) {
            return undefined;
        }

        if (!finalValue.every(entry => defaultEnum.includes(entry as T))) {
            throw new PaginationFilterInvalidValueEnumException(
                field,
                defaultEnum.join(', ')
            );
        }

        const customField = options?.customField ?? field;

        return {
            where: {
                [customField]:
                    operator === 'in'
                        ? { in: finalValue }
                        : { notIn: finalValue },
            },
            storeFilter: { [field]: finalValue },
        };
    }

    private buildSearchObject(
        search: string,
        availableSearch: readonly string[]
    ): { OR: Array<Record<string, Prisma.StringFilter>> } {
        return {
            OR: availableSearch.map(field => ({
                [field]: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                },
            })),
        };
    }

    private extractOrderByToArray(
        orderBy?: string | string[]
    ): Record<string, string>[] {
        if (!orderBy) {
            return [];
        }

        if (Array.isArray(orderBy)) {
            return orderBy.map(entry => {
                const trimmed = entry.toString().split(':');

                return {
                    [trimmed[0]]: trimmed[1]?.toLowerCase(),
                };
            });
        }

        const trimmed = orderBy.toString().split(':');
        return trimmed && trimmed.length > 0
            ? [
                  {
                      [trimmed[0]]: trimmed[1]?.toLowerCase(),
                  },
              ]
            : [];
    }

    private parseOrderBy(
        orderByExtractFromRequest: Record<string, string>[]
    ): IPaginationOrderBy[] {
        const parsedOrderBy: IPaginationOrderBy[] = [];

        for (const entry of orderByExtractFromRequest) {
            const field = Object.keys(entry)[0];
            const direction = entry[field];

            parsedOrderBy.push({
                [field]:
                    EnumPaginationOrderDirectionType[
                        direction as EnumPaginationOrderDirectionType
                    ],
            });
        }

        return parsedOrderBy;
    }

    private validateOrderBy(
        orderByExtractFromRequest: Record<string, string>[],
        availableOrderBy: readonly string[]
    ): IPaginationOrderBy[] {
        const flatOrderBy = orderByExtractFromRequest.reduce(
            (acc, entry) => ({ ...acc, ...entry }),
            {}
        );

        const fields = Object.keys(flatOrderBy);
        const directions = Object.values(flatOrderBy);

        const invalidField = fields.some(
            field => !availableOrderBy.includes(field)
        );
        const invalidDirection = directions.some(
            direction =>
                direction !== EnumPaginationOrderDirectionType.asc &&
                direction !== EnumPaginationOrderDirectionType.desc
        );

        if (invalidField) {
            throw new PaginationOrderByNotAllowedException(
                availableOrderBy.join(', ')
            );
        }

        if (invalidDirection) {
            throw new PaginationOrderDirectionNotAllowedException(
                PaginationAllowedOrderDirections.join(', ')
            );
        }

        return this.parseOrderBy(orderByExtractFromRequest);
    }

    private resolveOrderBy(
        orderBy: string | string[] | undefined,
        availableOrderBy: readonly string[]
    ): IPaginationOrderBy[] {
        const orderByExtractFromRequest = this.extractOrderByToArray(orderBy);

        if (
            orderByExtractFromRequest.length === 0 ||
            availableOrderBy.length === 0
        ) {
            return [...PaginationDefaultOrderBy];
        }

        return this.validateOrderBy(
            orderByExtractFromRequest,
            availableOrderBy
        );
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
            throw new PaginationPageExceedsMaximumException(
                PaginationDefaultMaxPage,
                finalPage
            );
        }

        if (finalPage < 1) {
            throw new PaginationPageCannotBeLessThanOneException(finalPage);
        }

        return finalPage;
    }

    private validateAndParsePerPage(
        perPage?: number | string,
        defaultPerPage: number = PaginationDefaultPerPage
    ): number {
        let finalPerPage = perPage ?? defaultPerPage;

        if (typeof finalPerPage === 'string') {
            finalPerPage = Number.parseInt(finalPerPage, 10);
        }

        if (!Number.isFinite(finalPerPage) || !Number.isInteger(finalPerPage)) {
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

        if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
            throw new PaginationInvalidCursorFormatException(
                'URL-safe base64 (A-Za-z0-9_-)'
            );
        }

        return trimmed;
    }

    offset<TArgsWhere = unknown>(
        dto: IPaginationOffsetQueryDto,
        options: IPaginationQueryOffsetOptions = {}
    ): {
        params: IPaginationQueryOffsetParams<TArgsWhere>;
        storePatch: Partial<IPaginationQuery>;
    } {
        try {
            const availableSearch = options.availableSearch ?? [];
            const availableOrderBy = options.availableOrderBy ?? [];
            const page = this.validateAndParsePage(dto.page);
            const perPage = this.validateAndParsePerPage(
                dto.perPage,
                options.defaultPerPage
            );
            const search = dto.search?.trim();
            const where =
                search && availableSearch.length > 0
                    ? this.buildSearchObject(search, availableSearch)
                    : undefined;
            const orderBy = this.resolveOrderBy(dto.orderBy, availableOrderBy);

            return {
                params: {
                    where,
                    limit: perPage,
                    skip: (page - 1) * perPage,
                    orderBy,
                } as IPaginationQueryOffsetParams<TArgsWhere>,
                storePatch: {
                    page,
                    perPage,
                    orderBy,
                    availableSearch,
                    availableOrderBy,
                    ...(search && availableSearch.length > 0 ? { search } : {}),
                },
            };
        } catch (error) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new PaginationInvalidOffsetPaginationParamsException();
        }
    }

    cursor<TArgsWhere = unknown>(
        dto: IPaginationCursorQueryDto,
        options: IPaginationQueryCursorOptions = {}
    ): {
        params: IPaginationQueryCursorParams<TArgsWhere>;
        storePatch: Partial<IPaginationQuery>;
    } {
        try {
            const availableSearch = options.availableSearch ?? [];
            const availableOrderBy = options.availableOrderBy ?? [];
            const perPage = this.validateAndParsePerPage(
                dto.perPage,
                options.defaultPerPage
            );
            const cursor = this.validateAndSanitizeCursor(dto.cursor);
            const search = dto.search?.trim();
            const where =
                search && availableSearch.length > 0
                    ? this.buildSearchObject(search, availableSearch)
                    : undefined;
            const orderBy = this.resolveOrderBy(dto.orderBy, availableOrderBy);
            const cursorField =
                options.cursorField ?? PaginationDefaultCursorField;

            return {
                params: {
                    where,
                    limit: perPage,
                    cursor,
                    cursorField,
                    orderBy,
                } as IPaginationQueryCursorParams<TArgsWhere>,
                storePatch: {
                    perPage,
                    cursor,
                    orderBy,
                    availableSearch,
                    availableOrderBy,
                    ...(search && availableSearch.length > 0 ? { search } : {}),
                },
            };
        } catch (error) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new PaginationInvalidCursorPaginationParamsException();
        }
    }

    equalBoolean<TField extends string>(
        field: TField,
        value: string | boolean | undefined | unknown,
        options?: IPaginationQueryFilterOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
        | undefined {
        if (typeof value === 'boolean') {
            const customField = options?.customField ?? field;

            return {
                where: {
                    [customField]: {
                        equals: value,
                    },
                },
                storeFilter: { [field]: value },
            };
        }

        return this.equal(field, value, {
            ...options,
            isBoolean: true,
        }) as
            | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
            | undefined;
    }

    equalString<TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        options?: IPaginationQueryFilterEqualOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
        | undefined {
        return this.equal(field, value, options) as
            | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
            | undefined;
    }

    equalNumber<TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        options?: IPaginationQueryFilterOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
        | undefined {
        return this.equal(field, value, { ...options, isNumber: true }) as
            | IPaginationQueryFilterResult<Record<string, IPaginationEqual>>
            | undefined;
    }

    notEqual<TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        options?: IPaginationQueryFilterEqualOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationNotEqual>>
        | undefined {
        if (typeof value !== 'string' || value.trim() === '') {
            return undefined;
        }

        const finalValue = this.coerceEqualValue(field, value, options);
        const customField = options?.customField ?? field;

        return {
            where: {
                [customField]: {
                    not: finalValue,
                },
            },
            storeFilter: { [field]: finalValue },
        };
    }

    inEnum<T, TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        defaultEnum: T[],
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationIn>> | undefined {
        return this.enumFilter(field, value, defaultEnum, 'in', options) as
            | IPaginationQueryFilterResult<Record<string, IPaginationIn>>
            | undefined;
    }

    ninEnum<T, TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        defaultEnum: T[],
        options?: IPaginationQueryFilterOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationNin>>
        | undefined {
        return this.enumFilter(field, value, defaultEnum, 'notIn', options) as
            | IPaginationQueryFilterResult<Record<string, IPaginationNin>>
            | undefined;
    }

    dateBetween<TField extends string>(
        field: TField,
        value: string | undefined | unknown,
        options?: IPaginationQueryFilterDateOptions
    ):
        | IPaginationQueryFilterResult<Record<string, IPaginationDate>>
        | undefined {
        if (typeof value !== 'string' || value.trim() === '') {
            return undefined;
        }

        const isIso = this.helperDateService.checkIso(value);
        if (!isIso) {
            throw new PaginationFilterInvalidValueException(field);
        }

        const finalValue = this.helperDateService.createFromIso(value, {
            dayOf: options?.dayOf,
        });
        const customField = options?.customField ?? field;
        const operation = options?.type
            ? options.type === EnumPaginationFilterDateBetweenType.start
                ? 'gte'
                : 'lte'
            : 'equal';

        return {
            where: {
                [customField]: {
                    [operation]: finalValue,
                },
            },
            storeFilter: { [field]: finalValue },
        };
    }
}
