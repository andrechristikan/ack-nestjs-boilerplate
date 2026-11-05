import { Injectable } from '@nestjs/common';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationFilterValueSeparator } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationFilterEnumOperator,
} from '@common/pagination/enums/pagination.enum';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';
import { PaginationFilterInvalidValueException } from '@common/pagination/exceptions/pagination.filter-invalid-value.exception';
import type {
    IPaginationDate,
    IPaginationEqual,
    IPaginationIn,
    IPaginationNin,
    IPaginationNotEqual,
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEqualOptions,
    IPaginationQueryFilterOptions,
    IPaginationQueryFilterResult,
} from '@common/pagination/interfaces/pagination.interface';

@Injectable()
export class PaginationFilterUtil {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService
    ) {}

    private equal<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterEqualOptions
    ): IPaginationQueryFilterResult | null {
        if (typeof value !== 'string' || value.trim() === '') {
            return null;
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
        if (options?.isBoolean === true) {
            const booleanString = value.trim();
            if (booleanString !== 'true' && booleanString !== 'false') {
                throw new PaginationFilterInvalidValueException(field);
            }

            return booleanString === 'true';
        }

        if (options?.isNumber === true) {
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
        value: unknown,
        defaultEnum: T[],
        operator: EnumPaginationFilterEnumOperator,
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult | null {
        if (
            typeof value !== 'string' ||
            value.trim() === '' ||
            !defaultEnum ||
            defaultEnum.length === 0
        ) {
            return null;
        }

        const finalValue = this.helperArrayService.unique(
            value
                .split(PaginationFilterValueSeparator)
                .map(entry => entry.trim())
                .filter(entry => entry !== '')
        );

        if (finalValue.length === 0) {
            return null;
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
                    operator === EnumPaginationFilterEnumOperator.in
                        ? { in: finalValue }
                        : { notIn: finalValue },
            },
            storeFilter: { [field]: finalValue },
        };
    }

    equalBoolean<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationEqual>> | null {
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
        }) as IPaginationQueryFilterResult<
            Record<string, IPaginationEqual>
        > | null;
    }

    equalString<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationEqual>> | null {
        return this.equal(
            field,
            value,
            options
        ) as IPaginationQueryFilterResult<
            Record<string, IPaginationEqual>
        > | null;
    }

    equalNumber<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationEqual>> | null {
        return this.equal(field, value, {
            ...options,
            isNumber: true,
        }) as IPaginationQueryFilterResult<
            Record<string, IPaginationEqual>
        > | null;
    }

    notEqual<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterEqualOptions
    ): IPaginationQueryFilterResult<
        Record<string, IPaginationNotEqual>
    > | null {
        if (typeof value !== 'string' || value.trim() === '') {
            return null;
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
        value: unknown,
        defaultEnum: T[],
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationIn>> | null {
        return this.enumFilter(
            field,
            value,
            defaultEnum,
            EnumPaginationFilterEnumOperator.in,
            options
        ) as IPaginationQueryFilterResult<Record<string, IPaginationIn>> | null;
    }

    ninEnum<T, TField extends string>(
        field: TField,
        value: unknown,
        defaultEnum: T[],
        options?: IPaginationQueryFilterOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationNin>> | null {
        return this.enumFilter(
            field,
            value,
            defaultEnum,
            EnumPaginationFilterEnumOperator.notIn,
            options
        ) as IPaginationQueryFilterResult<
            Record<string, IPaginationNin>
        > | null;
    }

    dateBetween<TField extends string>(
        field: TField,
        value: unknown,
        options?: IPaginationQueryFilterDateOptions
    ): IPaginationQueryFilterResult<Record<string, IPaginationDate>> | null {
        if (typeof value !== 'string' || value.trim() === '') {
            return null;
        }

        const isIso = this.helperDateService.checkIso(value);
        if (!isIso) {
            throw new PaginationFilterInvalidValueException(field);
        }

        const dayOf = options?.dayOf ?? null;
        const finalValue = this.helperDateService.createFromIso(value, {
            ...(dayOf !== null && { dayOf }),
        });
        const customField = options?.customField ?? field;
        const operation = options?.type
            ? options.type === EnumPaginationFilterDateBetweenType.start
                ? 'gte'
                : 'lte'
            : 'equals';

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
