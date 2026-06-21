import {
    Injectable,
    Type,
    mixin,
} from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationDate,
    IPaginationEqual,
    IPaginationIn,
    IPaginationNin,
    IPaginationNotEqual,
    IPaginationQuery,
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEnumOptions,
    IPaginationQueryFilterEqualOptions,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationFilterDateBetweenType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';
import { PaginationFilterInvalidValueException } from '@common/pagination/exceptions/pagination.filter-invalid-value.exception';

/**
 * Pipe validating a comma-separated value against an enum and emitting an `in` filter.
 */
export function PaginationQueryFilterInEnumPipe<T>(
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(
            private readonly helperService: HelperService,
            private readonly requestStoreService: RequestStoreService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationIn> | undefined> {
            if (
                !value ||
                value.trim() === '' ||
                !defaultEnum ||
                defaultEnum.length === 0
            ) {
                return;
            }

            const finalValue = this.helperService.arrayUnique(
                value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v !== '')
            );

            if (finalValue.length === 0) {
                return;
            }

            const validated = finalValue.every(v =>
                defaultEnum.includes(v as T)
            );
            if (!validated) {
                throw new PaginationFilterInvalidValueEnumException(metadata.data!, defaultEnum.join(', '));
            }

            const field = metadata.data!;
            const filters =
                this.requestStoreService.get<Partial<IPaginationQuery>>(
                    PaginationStoreKey
                )?.filters;
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    filters: filters
                        ? { ...filters, [field]: finalValue }
                        : { [field]: finalValue },
                }
            );

            const customField = options?.customField ?? field;
            return {
                [customField]: {
                    in: finalValue,
                },
            };
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}

/**
 * Pipe validating a comma-separated value against an enum and emitting a `notIn` filter.
 */
export function PaginationQueryFilterNinEnumPipe<T>(
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterNinEnumPipe implements PipeTransform {
        constructor(
            private readonly helperService: HelperService,
            private readonly requestStoreService: RequestStoreService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationNin> | undefined> {
            if (
                !value ||
                value.trim() === '' ||
                !defaultEnum ||
                defaultEnum.length === 0
            ) {
                return;
            }

            const finalValue = this.helperService.arrayUnique(
                value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v !== '')
            );

            if (finalValue.length === 0) {
                return;
            }

            const validated = finalValue.every(v =>
                defaultEnum.includes(v as T)
            );
            if (!validated) {
                throw new PaginationFilterInvalidValueEnumException(metadata.data!, defaultEnum.join(', '));
            }

            const field = metadata.data!;
            const filters =
                this.requestStoreService.get<Partial<IPaginationQuery>>(
                    PaginationStoreKey
                )?.filters;
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    filters: filters
                        ? { ...filters, [field]: finalValue }
                        : { [field]: finalValue },
                }
            );

            const customField = options?.customField ?? field;
            return {
                [customField]: {
                    notIn: finalValue,
                },
            };
        }
    }

    return mixin(MixinPaginationFilterNinEnumPipe);
}

/**
 * Pipe coercing a value (string/number/boolean per options) and emitting an `equals` filter.
 */
export function PaginationQueryFilterEqualPipe<T>(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationEqual> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            let finalValue: T;
            if (options && 'isBoolean' in options && options.isBoolean) {
                const booleanString = value.trim();
                if (booleanString !== 'true' && booleanString !== 'false') {
                    throw new PaginationFilterInvalidValueException(metadata.data!);
                }

                finalValue = (booleanString === 'true') as T;
            } else if (options && 'isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (Number.isNaN(finalValue as number)) {
                    throw new PaginationFilterInvalidValueException(metadata.data!);
                }
            } else {
                finalValue = value.trim() as T;
            }

            const field = metadata.data!;
            const filters =
                this.requestStoreService.get<Partial<IPaginationQuery>>(
                    PaginationStoreKey
                )?.filters;
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    filters: filters
                        ? {
                              ...filters,
                              [field]: finalValue as string | number | boolean,
                          }
                        : { [field]: finalValue as string | number | boolean },
                }
            );

            const customField = options?.customField ?? field;

            return {
                [customField]: {
                    equals: finalValue as string | number | boolean,
                },
            };
        }
    }

    return mixin(MixinPaginationFilterEqualPipe);
}

/**
 * Pipe coercing a value (string/number/boolean per options) and emitting a `not` filter.
 */
export function PaginationQueryFilterNotEqualPipe<T>(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterNotEqualPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationNotEqual> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            let finalValue: T;
            if (options && 'isBoolean' in options && options.isBoolean) {
                const booleanString = value.trim();
                if (booleanString !== 'true' && booleanString !== 'false') {
                    throw new PaginationFilterInvalidValueException(metadata.data!);
                }

                finalValue = (booleanString === 'true') as T;
            } else if (options && 'isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (Number.isNaN(finalValue as number)) {
                    throw new PaginationFilterInvalidValueException(metadata.data!);
                }
            } else {
                finalValue = value.trim() as T;
            }

            const field = metadata.data!;
            const filters =
                this.requestStoreService.get<Partial<IPaginationQuery>>(
                    PaginationStoreKey
                )?.filters;
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    filters: filters
                        ? {
                              ...filters,
                              [field]: finalValue as string | number | boolean,
                          }
                        : { [field]: finalValue as string | number | boolean },
                }
            );

            const customField = options?.customField ?? field;

            return {
                [customField]: {
                    not: finalValue as string | number | boolean,
                },
            };
        }
    }

    return mixin(MixinPaginationFilterNotEqualPipe);
}

/**
 * Pipe validating an ISO date and emitting a `gte`/`lte`/`equal` filter per the range type.
 */
export function PaginationQueryFilterDatePipe(
    options?: IPaginationQueryFilterDateOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            private readonly helperService: HelperService,
            private readonly requestStoreService: RequestStoreService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationDate> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            if (!this.helperService.dateCheckIso(value)) {
                throw new PaginationFilterInvalidValueException(
                    metadata.data!
                );
            }

            const finalValue = this.helperService.dateCreateFromIso(value, {
                dayOf: options?.dayOf,
            });

            const field = metadata.data!;
            const filters =
                this.requestStoreService.get<Partial<IPaginationQuery>>(
                    PaginationStoreKey
                )?.filters;
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    filters: filters
                        ? { ...filters, [field]: finalValue }
                        : { [field]: finalValue },
                }
            );

            const customField = options?.customField ?? field;
            const operation = options?.type
                ? options.type === EnumPaginationFilterDateBetweenType.start
                    ? 'gte'
                    : 'lte'
                : 'equal';

            return {
                [customField]: {
                    [operation]: finalValue,
                },
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
