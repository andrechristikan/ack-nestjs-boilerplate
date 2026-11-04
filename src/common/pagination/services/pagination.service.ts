import {
    PaginationCursorDateKey,
    PaginationCursorFingerprintLength,
    PaginationDefaultCursorField,
    PaginationDefaultOrderBy,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorArgs,
    IPaginationCursorJson,
    IPaginationCursorReturn,
    IPaginationCursorScalar,
    IPaginationCursorValue,
    IPaginationOffsetArgs,
    IPaginationOffsetReturn,
    IPaginationOrderBy,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { Injectable } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { Prisma } from '@generated/prisma-client/client';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidCursorDataException } from '@common/pagination/exceptions/pagination.invalid-cursor-data.exception';
import { PaginationFailedToEncodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-encode-cursor.exception';

@Injectable()
export class PaginationService {
    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly paginationQueryUtil: PaginationQueryUtil
    ) {}

    private canonicalize(value: unknown): unknown {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (Array.isArray(value)) {
            return value.map(item => this.canonicalize(item));
        }

        if (value !== null && typeof value === 'object') {
            const source = value as Record<string, unknown>;

            return Object.keys(source)
                .sort()
                .reduce<Record<string, unknown>>((acc, key) => {
                    acc[key] = this.canonicalize(source[key]);

                    return acc;
                }, {});
        }

        return value;
    }

    private fingerprint(where: unknown, orderBy: IPaginationOrderBy[]): string {
        const canonical = this.canonicalize({ where, orderBy });

        const hash = this.helperHashService.sha256Hash(
            JSON.stringify(canonical)
        );

        return hash.slice(0, PaginationCursorFingerprintLength);
    }

    private cursorTerms(
        orderBy: IPaginationOrderBy[]
    ): [string, EnumPaginationOrderDirectionType][] {
        const terms = new Map<string, EnumPaginationOrderDirectionType>();
        for (const [field, direction] of orderBy.flatMap(term =>
            Object.entries(term)
        )) {
            if (!terms.has(field)) {
                terms.set(field, direction);
            }
        }

        return [...terms];
    }

    private encodeCursor(
        item: Record<string, unknown>,
        orderBy: IPaginationOrderBy[],
        fingerprint: string,
        firstPageAt: Date
    ): string {
        const terms = this.cursorTerms(orderBy);

        for (const [field] of terms) {
            if ((item[field] ?? null) === null) {
                throw new PaginationInvalidCursorDataException();
            }
        }

        try {
            const values: Record<string, IPaginationCursorJson> = {};
            for (const [field] of terms) {
                const value = item[field];
                values[field] =
                    value instanceof Date
                        ? { [PaginationCursorDateKey]: value.toISOString() }
                        : (value as IPaginationCursorJson);
            }

            return this.paginationQueryUtil.sealCursor({
                values,
                fingerprint,
                firstPageAt,
            });
        } catch {
            throw new PaginationFailedToEncodeCursorException();
        }
    }

    private decodeCursorValue(raw: unknown): IPaginationCursorScalar {
        if (
            typeof raw === 'string' ||
            typeof raw === 'boolean' ||
            (typeof raw === 'number' && Number.isFinite(raw))
        ) {
            return raw;
        }

        if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
            const keys = Object.keys(raw);
            const iso = (raw as Record<string, unknown>)[
                PaginationCursorDateKey
            ];

            if (
                keys.length === 1 &&
                keys[0] === PaginationCursorDateKey &&
                typeof iso === 'string'
            ) {
                const isIso = this.helperDateService.checkIso(iso);
                if (isIso) {
                    return this.helperDateService.createFromIso(iso);
                }
            }
        }

        throw new PaginationInvalidCursorDataException();
    }

    private decodeCursor(
        cursor: string,
        fingerprint: string,
        orderBy: IPaginationOrderBy[],
        cursorField: string
    ): IPaginationCursorValue {
        if (!cursor || typeof cursor !== 'string') {
            throw new PaginationInvalidCursorFormatException();
        }

        const {
            values,
            fingerprint: tokenFingerprint,
            firstPageAt,
        } = this.paginationQueryUtil.openCursor(cursor);

        if (tokenFingerprint !== fingerprint) {
            throw new PaginationInvalidCursorPaginationParamsException();
        }

        const terms = this.cursorTerms(orderBy);
        const fields = terms.map(([field]) => field);
        if (
            Object.keys(values).length !== fields.length ||
            fields.some(field => !Object.hasOwn(values, field))
        ) {
            throw new PaginationInvalidCursorDataException();
        }

        const parsed: Record<string, IPaginationCursorScalar> = {};
        for (const field of fields) {
            parsed[field] = this.decodeCursorValue(values[field]);
        }

        if (cursorField === PaginationDefaultCursorField) {
            const id = parsed[cursorField];
            if (typeof id !== 'string') {
                throw new PaginationInvalidCursorDataException();
            }

            const isValidId = this.databaseUtil.checkIdIsValid(id);
            if (!isValidId) {
                throw new PaginationInvalidCursorDataException();
            }
        }

        return { values: parsed, fingerprint: tokenFingerprint, firstPageAt };
    }

    private keyset(
        orderBy: IPaginationOrderBy[],
        values: Record<string, IPaginationCursorScalar>
    ): { OR: Record<string, unknown>[] } {
        const terms = this.cursorTerms(orderBy);

        return {
            OR: terms.flatMap(([field, direction], index) => {
                const equal = terms
                    .slice(0, index)
                    .map(([prior]) => [prior, values[prior]]);
                const value = values[field];
                const isAscending =
                    direction === EnumPaginationOrderDirectionType.asc;

                if (typeof value === 'boolean') {
                    return value === isAscending
                        ? []
                        : [Object.fromEntries([...equal, [field, !value]])];
                }

                const operator = isAscending ? 'gt' : 'lt';

                return [
                    Object.fromEntries([
                        ...equal,
                        [field, { [operator]: value }],
                    ]),
                ];
            }),
        };
    }

    private selectSortFields(
        select: unknown,
        orderBy: IPaginationOrderBy[]
    ): { select: unknown; added: string[] } {
        if (!select) {
            return { select, added: [] };
        }

        const picked = select as Record<string, unknown>;
        const added = orderBy
            .flatMap(term => Object.keys(term))
            .filter(field => picked[field] !== true);

        if (added.length === 0) {
            return { select, added };
        }

        return {
            select: {
                ...picked,
                ...Object.fromEntries(added.map(field => [field, true])),
            },
            added,
        };
    }

    private resolveOrderBy(
        orderBy: IPaginationOrderBy[],
        tiebreakField: string
    ): IPaginationOrderBy[] {
        const resolved =
            orderBy.length === 0 ? [...PaginationDefaultOrderBy] : orderBy;

        if (resolved.some(term => tiebreakField in term)) {
            return resolved;
        }

        const lastTerm = resolved[resolved.length - 1]!;
        const direction = Object.values(lastTerm)[0]!;

        return [...resolved, { [tiebreakField]: direction }];
    }

    offsetPage<TReturn>(
        items: TReturn[],
        count: number,
        params: { skip: number; limit: number }
    ): IPaginationOffsetReturn<TReturn> {
        const { skip, limit } = params;
        const currentPage = Math.floor(skip / limit) + 1;
        const totalPage = Math.ceil(count / limit);
        const hasNext = currentPage < totalPage;
        const hasPrevious = currentPage > 1;
        const nextPage = hasNext ? currentPage + 1 : null;
        const previousPage = hasPrevious ? currentPage - 1 : null;

        return {
            type: EnumPaginationType.offset,
            count,
            perPage: limit,
            page: currentPage,
            totalPage,
            hasNext,
            hasPrevious,
            data: items,
            ...(nextPage && { nextPage }),
            ...(previousPage && { previousPage }),
        };
    }

    async offset<TReturn, TArgsWhere = unknown>(
        repository: IPaginationRepository,
        args: IPaginationOffsetArgs<TArgsWhere>
    ): Promise<IPaginationOffsetReturn<TReturn>> {
        const { limit, skip, where, include, select } = args;
        const orderBy = this.resolveOrderBy(
            args.orderBy,
            PaginationDefaultCursorField
        );

        const [count, items] = await Promise.all([
            repository.count({
                where,
            }),
            repository.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include,
                select,
            }),
        ]);

        return this.offsetPage(items as TReturn[], count, { skip, limit });
    }

    async cursor<TReturn, TArgsWhere = unknown>(
        repository: IPaginationRepository,
        args: IPaginationCursorArgs<TArgsWhere>
    ): Promise<IPaginationCursorReturn<TReturn>> {
        const {
            limit,
            where,
            include,
            select,
            cursor,
            cursorField = PaginationDefaultCursorField,
            includeCount,
        } = args;
        const orderBy = this.resolveOrderBy(args.orderBy, cursorField);
        const fingerprint = this.fingerprint(where, orderBy);

        const { select: readSelect, added } = this.selectSortFields(
            select,
            orderBy
        );
        let pageWhere: unknown = where;
        if (cursor) {
            const decoded = this.decodeCursor(
                cursor,
                fingerprint,
                orderBy,
                cursorField
            );
            const keyset = this.keyset(orderBy, decoded.values);
            pageWhere = {
                AND: [...(where ? [where] : []), keyset],
            };
        }

        const take = limit + 1;
        const queries: Promise<unknown>[] = [
            repository.findMany({
                where: pageWhere,
                take,
                orderBy,
                include,
                select: readSelect,
            }),
        ];

        if (includeCount) {
            queries.push(repository.count({ where }));
        }

        let results: unknown[];
        try {
            results = await Promise.all(queries);
        } catch (error) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            if (cursor && error instanceof Prisma.PrismaClientValidationError) {
                throw new PaginationInvalidCursorDataException();
            }

            throw new AppUnknownException(error);
        }
        const items = results[0] as Record<string, unknown>[];
        const count = includeCount ? (results[1] as number) : null;

        const hasNext = items.length > limit;
        const page = hasNext ? items.slice(0, limit) : items;

        let nextCursor: string | null = null;
        if (hasNext) {
            nextCursor = this.encodeCursor(
                page[page.length - 1]!,
                orderBy,
                fingerprint,
                args.firstPageAt
            );
        }

        const data =
            added.length === 0
                ? page
                : page.map(row =>
                      Object.fromEntries(
                          Object.entries(row).filter(
                              ([field]) => !added.includes(field)
                          )
                      )
                  );

        return {
            type: EnumPaginationType.cursor,
            ...(nextCursor && { cursor: nextCursor }),
            perPage: limit,
            hasNext,
            data: data as TReturn[],
            ...(count !== null && { count }),
        };
    }
}
