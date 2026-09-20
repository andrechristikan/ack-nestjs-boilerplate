import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticSortUtil {
    private compareValues(left: unknown, right: unknown): number {
        if (left instanceof Date && right instanceof Date) {
            return left.getTime() - right.getTime();
        }

        if (typeof left === 'number' && typeof right === 'number') {
            return left - right;
        }

        const leftText = String(left);
        const rightText = String(right);

        if (leftText === rightText) {
            return 0;
        }

        return leftText < rightText ? -1 : 1;
    }

    sortRows<T extends object>(
        rows: T[],
        orderBy: IPaginationOrderBy[] | undefined,
        sortableKeys: (keyof T)[]
    ): T[] {
        const allowedFields: string[] = sortableKeys.map(key => String(key));
        const terms = (orderBy ?? []).filter(term => {
            const field = Object.keys(term)[0];

            return allowedFields.includes(field);
        });

        if (terms.length === 0) {
            return rows;
        }

        return [...rows].sort((left, right) => {
            for (const term of terms) {
                const field = Object.keys(term)[0];
                const leftValue: unknown = Reflect.get(left, field);
                const rightValue: unknown = Reflect.get(right, field);
                const compared = this.compareValues(leftValue, rightValue);

                if (compared !== 0) {
                    return term[field] === EnumPaginationOrderDirectionType.desc
                        ? -compared
                        : compared;
                }
            }

            return 0;
        });
    }
}
