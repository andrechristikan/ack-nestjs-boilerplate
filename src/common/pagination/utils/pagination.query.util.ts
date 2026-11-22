import { Injectable } from '@nestjs/common';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';
import type { PaginationCursorQueryDto } from '@common/pagination/dtos/pagination.cursor-query.dto';
import type { PaginationOffsetQueryDto } from '@common/pagination/dtos/pagination.offset-query.dto';
import type { PaginationOrderByQueryDto } from '@common/pagination/dtos/pagination.order-by-query.dto';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import type {
    IPaginationOrderBy,
    IPaginationOrderByPresets,
    IPaginationQueryCursorOptions,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetOptions,
    IPaginationQueryOffsetParams,
    IPaginationQueryPatch,
    IPaginationQueryPresetOptions,
    IPaginationSearchWhere,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class PaginationQueryUtil {
    constructor(
        private readonly paginationCursorUtil: PaginationCursorUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil
    ) {}

    private buildSearchObject(
        search: string,
        availableSearch: readonly string[]
    ): IPaginationSearchWhere {
        return {
            OR: availableSearch.map(field => ({
                [field]: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                },
            })),
        };
    }

    private resolvePreset(
        requested: string | null,
        presets: IPaginationOrderByPresets,
        defaultName: string
    ): { name: string; terms: IPaginationOrderBy[] } {
        const name =
            requested !== null && Object.hasOwn(presets, requested)
                ? requested
                : defaultName;

        return { name, terms: [...presets[name]!] };
    }

    private resolveSearchAndOrder<T extends IPaginationOrderByPresets>(
        rawSearch: string | null,
        requestedOrderBy: string | null,
        availableSearch: readonly string[],
        options: IPaginationQueryPresetOptions<T>
    ): {
        where: IPaginationSearchWhere | null;
        search: string | null;
        name: string;
        orderBy: IPaginationOrderBy[];
    } {
        const search = rawSearch?.trim() ?? null;
        let where: IPaginationSearchWhere | null = null;
        if (search && availableSearch.length > 0) {
            where = this.buildSearchObject(search, availableSearch);
        }
        const { name, terms: orderBy } = this.resolvePreset(
            requestedOrderBy,
            options.orderBy,
            options.defaultOrderBy
        );

        return { where, search, name, orderBy };
    }

    private buildStoreTail<T extends IPaginationOrderByPresets>(
        name: string,
        availableSearch: readonly string[],
        search: string | null,
        options: IPaginationQueryPresetOptions<T>
    ): IPaginationQueryPatch {
        return {
            orderBy: name,
            availableSearch,
            availableOrderBy: Object.keys(options.orderBy),
            ...(search && availableSearch.length > 0 ? { search } : {}),
        };
    }

    private validateAndParsePage(page: number | string | null): number {
        const result = this.paginationOffsetUtil.parsePage(page);
        if (result instanceof AppBaseException) {
            throw result;
        }

        return result;
    }

    private validateAndParsePerPage(
        perPage: number | string | null,
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

    private validateAndSanitizeCursor(cursor: string | null): string | null {
        if (typeof cursor !== 'string') {
            return null;
        }

        const trimmed = cursor.trim();

        if (trimmed === '') {
            return null;
        }

        const failure = this.paginationCursorUtil.checkFormat(trimmed);
        if (failure instanceof AppBaseException) {
            throw failure;
        }

        return trimmed;
    }

    offset<T extends IPaginationOrderByPresets>(
        dto: PaginationOffsetQueryDto & PaginationOrderByQueryDto,
        options: IPaginationQueryOffsetOptions<T>
    ): {
        params: IPaginationQueryOffsetParams;
        storePatch: IPaginationQueryPatch;
    } {
        const availableSearch = options.availableSearch ?? [];
        const page = this.validateAndParsePage(dto.page ?? null);
        const perPage = this.validateAndParsePerPage(
            dto.perPage ?? null,
            options.defaultPerPage
        );
        const { where, search, name, orderBy } = this.resolveSearchAndOrder(
            dto.search ?? null,
            dto.orderBy ?? null,
            availableSearch,
            options
        );
        const skip = this.paginationOffsetUtil.skip(page, perPage);

        const storeTail = this.buildStoreTail(
            name,
            availableSearch,
            search,
            options
        );

        return {
            params: {
                ...(where && { where }),
                limit: perPage,
                skip,
                orderBy,
            },
            storePatch: {
                page,
                perPage,
                ...storeTail,
            },
        };
    }

    cursor<T extends IPaginationOrderByPresets>(
        dto: PaginationCursorQueryDto & PaginationOrderByQueryDto,
        options: IPaginationQueryCursorOptions<T>
    ): {
        params: IPaginationQueryCursorParams;
        storePatch: IPaginationQueryPatch;
    } {
        const availableSearch = options.availableSearch ?? [];
        const perPage = this.validateAndParsePerPage(
            dto.perPage ?? null,
            options.defaultPerPage
        );
        const cursor = this.validateAndSanitizeCursor(dto.cursor ?? null);
        const { where, search, name, orderBy } = this.resolveSearchAndOrder(
            dto.search ?? null,
            dto.orderBy ?? null,
            availableSearch,
            options
        );
        const fingerprint = this.paginationCursorUtil.fingerprint(
            options.scope,
            dto,
            orderBy
        );

        const storeTail = this.buildStoreTail(
            name,
            availableSearch,
            search,
            options
        );

        return {
            params: {
                ...(where && { where }),
                limit: perPage,
                ...(cursor && { cursor }),
                orderBy,
                fingerprint,
            },
            storePatch: {
                perPage,
                ...(cursor && { cursor }),
                ...storeTail,
            },
        };
    }

    resolveTiebreak(
        orderBy: IPaginationOrderBy[],
        field: string
    ): IPaginationOrderBy[] {
        const resolved =
            orderBy.length === 0 ? [...PaginationDefaultOrderBy] : orderBy;

        if (resolved.some(term => field in term)) {
            return resolved;
        }

        const lastTerm = resolved[resolved.length - 1]!;
        const direction = Object.values(lastTerm)[0]!;

        return [...resolved, { [field]: direction }];
    }
}
