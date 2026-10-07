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
        orderBy: IPaginationOrderBy[],
        sortableKeys: (keyof T)[]
    ): T[] {
        const allowedFields: string[] = sortableKeys.map(key => String(key));
        const terms = orderBy
            .flatMap(term => Object.entries(term).slice(0, 1))
            .filter(([field]) => allowedFields.includes(field));

        if (terms.length === 0) {
            return rows;
        }

        return [...rows].sort((left, right) => {
            for (const [field, direction] of terms) {
                const leftValue: unknown = Reflect.get(left, field);
                const rightValue: unknown = Reflect.get(right, field);
                const compared = this.compareValues(leftValue, rightValue);

                if (compared !== 0) {
                    return direction === EnumPaginationOrderDirectionType.desc
                        ? -compared
                        : compared;
                }
            }

            return 0;
        });
    }
}
