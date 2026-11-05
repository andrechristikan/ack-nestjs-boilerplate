import { PaginationDefaultCursorField } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorArgs,
    IPaginationCursorReturn,
    IPaginationDelegate,
    IPaginationDelegateRow,
    IPaginationDelegateShape,
    IPaginationOffsetArgs,
    IPaginationOffsetReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { Injectable } from '@nestjs/common';
import { PaginationFailedToDecodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-decode-cursor.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidCursorDataException } from '@common/pagination/exceptions/pagination.invalid-cursor-data.exception';

@Injectable()
export class PaginationService {
    constructor(
        private readonly paginationCursorUtil: PaginationCursorUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil
    ) {}

    async offset<
        TDelegate extends IPaginationDelegate,
        TShape extends IPaginationDelegateShape<TDelegate>,
    >(
        delegate: TDelegate,
        args: IPaginationOffsetArgs<TDelegate> & TShape
    ): Promise<
        IPaginationOffsetReturn<IPaginationDelegateRow<TDelegate, TShape>>
    > {
        const { limit, skip, where, include, select } = args;
        const orderBy = this.paginationQueryUtil.resolveTiebreak(
            args.orderBy,
            PaginationDefaultCursorField
        );

        const [count, items] = await Promise.all([
            delegate.count({ where } as never),
            delegate.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include,
                select,
            } as never),
        ]);

        return this.paginationOffsetUtil.page(
            items as IPaginationDelegateRow<TDelegate, TShape>[],
            count,
            { skip, limit }
        );
    }

    async cursor<
        TDelegate extends IPaginationDelegate,
        TShape extends IPaginationDelegateShape<TDelegate>,
    >(
        delegate: TDelegate,
        args: IPaginationCursorArgs<TDelegate> & TShape
    ): Promise<
        IPaginationCursorReturn<IPaginationDelegateRow<TDelegate, TShape>>
    > {
        const {
            limit,
            where,
            include,
            select,
            cursor,
            fingerprint,
            includeCount,
        } = args;
        const orderBy = this.paginationQueryUtil.resolveTiebreak(
            args.orderBy,
            PaginationDefaultCursorField
        );

        let pageWhere: unknown = where;
        if (cursor) {
            const opened = this.paginationCursorUtil.open(cursor);
            if (opened === null) {
                throw new PaginationFailedToDecodeCursorException();
            }

            if (opened.fingerprint !== fingerprint) {
                throw new PaginationInvalidCursorPaginationParamsException();
            }

            const values = this.paginationCursorUtil.decodeValues(
                opened.values,
                orderBy
            );
            if (values === null) {
                throw new PaginationInvalidCursorDataException();
            }

            pageWhere = {
                AND: [
                    ...(where ? [where] : []),
                    this.paginationCursorUtil.keyset(orderBy, values),
                ],
            };
        }

        const [rows, count] = await Promise.all([
            delegate.findMany({
                where: pageWhere,
                take: limit + 1,
                orderBy,
                include,
                select,
            } as never),
            includeCount ? delegate.count({ where } as never) : null,
        ]);
        const items = rows as IPaginationDelegateRow<TDelegate, TShape>[];

        const hasNext = items.length > limit;
        const data = hasNext ? items.slice(0, limit) : items;

        let nextCursor: string | null = null;
        if (hasNext) {
            const values = this.paginationCursorUtil.encodeValues(
                data[data.length - 1]!,
                orderBy
            );
            if (values === null) {
                throw new PaginationInvalidCursorDataException();
            }

            nextCursor = this.paginationCursorUtil.seal({
                values,
                fingerprint,
            });
        }

        return {
            type: EnumPaginationType.cursor,
            ...(nextCursor && { cursor: nextCursor }),
            ...(count !== null && { count }),
            perPage: limit,
            hasNext,
            data,
        };
    }
}
