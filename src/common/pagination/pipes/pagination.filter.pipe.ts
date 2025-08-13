import {
    Inject,
    Injectable,
    Type,
    UnprocessableEntityException,
    mixin,
} from '@nestjs/common';
import {
    ArgumentMetadata,
    PipeTransform,
    Scope,
} from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEnumOptions,
    IPaginationQueryFilterEqualOptions,
    IPaginationQueryFilterOptions,
} from '@common/pagination/interfaces/pagination.interface';
import { IDatabaseFilterOperation } from '@common/database/interfaces/database.interface';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE } from '@common/pagination/enums/pagination.enum';

/**
 * Creates a pagination filter pipe for enum values using IN operation.
 * Validates that provided values exist in the allowed enum and creates database filter with IN condition.
 *
 * @param defaultEnum - Array of allowed enum values
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterInEnumPipe<T>(
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
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
                    .map(v => (options?.isNumber ? Number.parseInt(v) : v))
            );

            if (finalValue.length === 0) {
                return;
            }

            const validated = finalValue.every(v =>
                defaultEnum.includes(v as T)
            );
            if (!validated) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    in: finalValue,
                },
            };
        }

        /**
         * Adds filter information to the request instance for later access.
         * Stores the field name and filtered values in the request pagination metadata.
         *
         * @param field - Field name being filtered
         * @param value - Array of filtered values (string or number)
         */
        addToRequestInstance(field: string, value: (string | number)[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}

/**
 * Creates a pagination filter pipe for enum values using NOT IN operation.
 * Validates that provided values exist in the allowed enum and creates database filter with NOT IN condition.
 *
 * @param defaultEnum - Array of allowed enum values
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterNinEnumPipe<T>(
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
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
                    .map(v => (options?.isNumber ? Number.parseInt(v) : v))
            );

            if (finalValue.length === 0) {
                return;
            }

            const validated = finalValue.every(v =>
                defaultEnum.includes(v as T)
            );
            if (!validated) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    notIn: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: (string | number)[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}

/**
 * Creates a pagination filter pipe for boolean values using IN operation.
 * Transforms comma-separated boolean strings to boolean array and creates database filter with IN condition.
 *
 * @param options - Configuration options including custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterInBooleanPipe(
    options?: IPaginationQueryFilterOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            const finalValue: boolean[] = this.helperService.arrayUnique(
                value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v !== '')
                    .map(v => (v.toLowerCase() === 'true' ? true : false))
            );

            if (finalValue.length === 0) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    in: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: boolean[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}

/**
 * Creates a pagination filter pipe for boolean values using NOT IN operation.
 * Transforms comma-separated boolean strings to boolean array and creates database filter with NOT IN condition.
 *
 * @param options - Configuration options including custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterNinBooleanPipe(
    options?: IPaginationQueryFilterOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            const finalValue: boolean[] = this.helperService.arrayUnique(
                value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v !== '')
                    .map(v => (v.toLowerCase() === 'true' ? true : false))
            );

            if (finalValue.length === 0) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    notIn: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: boolean[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}

/**
 * Creates a pagination filter pipe for exact value matching using EQUAL operation.
 * Validates and transforms string or numeric values for exact database matching.
 *
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterEqualPipe(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) protected readonly request: IRequestApp) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            const finalValue: string | number = options?.isNumber
                ? Number.parseInt(value.trim())
                : value.trim();

            if (
                !finalValue ||
                (options.isNumber && isNaN(finalValue as number))
            ) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    equal: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: string | number): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterEqualPipe);
}

/**
 * Creates a pagination filter pipe for non-matching values using NOT EQUAL operation.
 * Validates and transforms string or numeric values for database exclusion matching.
 *
 * @param options - Configuration options including number parsing and custom field mapping
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterNotEqualPipe(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) protected readonly request: IRequestApp) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            const finalValue: string | number = options?.isNumber
                ? Number.parseInt(value.trim())
                : value.trim();

            if (
                !finalValue ||
                (options.isNumber && isNaN(finalValue as number))
            ) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            return {
                [customField]: {
                    not: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: string | number): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterEqualPipe);
}

/**
 * Creates a pagination filter pipe for date filtering operations.
 * Validates ISO date strings and creates database filters for date comparisons (equal, gte, lte).
 *
 * @param options - Configuration options including date type, custom field mapping, and day handling
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationQueryFilterDatePipe(
    options?: IPaginationQueryFilterDateOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IDatabaseFilterOperation> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            if (!this.helperService.dateCheckIso(value)) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
                    message: `pagination.error.filterInvalidValue`,
                    messageProperties: {
                        property: metadata.data,
                    },
                });
            }

            const finalValue = this.helperService.dateCreateFromIso(value, {
                dayOf: options?.dayOf,
            });

            this.addToRequestInstance(metadata.data, finalValue);

            const customField = options?.customField ?? metadata.data;
            const operation = options?.type
                ? options.type ===
                  ENUM_PAGINATION_FILTER_DATE_BETWEEN_TYPE.START
                    ? 'gte'
                    : 'lte'
                : 'equal';
            return {
                [customField]: {
                    [operation]: finalValue,
                },
            };
        }

        addToRequestInstance(field: string, value: Date): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : {
                          [field]: value,
                      },
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
