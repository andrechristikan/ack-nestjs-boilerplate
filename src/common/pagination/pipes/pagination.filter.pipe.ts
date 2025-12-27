import {
    BadRequestException,
    Inject,
    Injectable,
    Type,
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
    IPaginationDate,
    IPaginationEqual,
    IPaginationIn,
    IPaginationNin,
    IPaginationNotEqual,
    IPaginationQueryFilterDateOptions,
    IPaginationQueryFilterEnumOptions,
    IPaginationQueryFilterEqualOptions,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumPaginationFilterDateBetweenType } from '@common/pagination/enums/pagination.enum';

/**
 * Creates a pipe that validates and transforms comma-separated string values against an enum array using 'in' operator.
 * Converts query parameters to database filter format for enum inclusion filtering.
 * @template T - The enum type to validate against
 * @param {T[]} defaultEnum - Array of valid enum values to validate against
 * @param {IPaginationQueryFilterEnumOptions} [options] - Optional configuration for custom field mapping
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for enum validation with 'in' operator
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

        /**
         * Transforms comma-separated string into pagination filter object with 'in' operator.
         * @param {string} value - Comma-separated string values to validate
         * @param {ArgumentMetadata} metadata - NestJS argument metadata containing field information
         * @returns {Promise<Record<string, IPaginationIn> | undefined>} Pagination filter object or undefined
         */
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
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.filterInvalidValue,
                    message: `pagination.error.filterInvalidValueEnum`,
                    messageProperties: {
                        property: metadata.data,
                        allowedValues: defaultEnum.join(', '),
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
 * Creates a pipe that validates and transforms comma-separated string values against an enum array using 'not in' operator.
 * Converts query parameters to database filter format for enum exclusion filtering.
 * @template T - The enum type to validate against
 * @param {T[]} defaultEnum - Array of valid enum values to validate against
 * @param {IPaginationQueryFilterEnumOptions} [options] - Optional configuration for custom field mapping
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for enum validation with 'not in' operator
 */
export function PaginationQueryFilterNinEnumPipe<T>(
    defaultEnum: T[],
    options?: IPaginationQueryFilterEnumOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterNinEnumPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        /**
         * Transforms comma-separated string into pagination filter object with 'not in' operator.
         * @param {string} value - Comma-separated string values to validate
         * @param {ArgumentMetadata} metadata - NestJS argument metadata containing field information
         * @returns {Promise<Record<string, IPaginationNin> | undefined>} Pagination filter object or undefined
         */
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
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.filterInvalidValue,
                    message: `pagination.error.filterInvalidValueEnum`,
                    messageProperties: {
                        property: metadata.data,
                        allowedValues: defaultEnum.join(', '),
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

    return mixin(MixinPaginationFilterNinEnumPipe);
}

/**
 * Creates a pipe that validates and transforms string values for equality filtering.
 * Converts query parameters to database filter format for equality comparison.
 * @template T - The type of value to validate and transform
 * @param {IPaginationQueryFilterEqualOptions} [options] - Configuration options for type conversion and custom field mapping
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for equality filtering
 */
export function PaginationQueryFilterEqualPipe<T>(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms string value into pagination filter object with equality operator.
         * @param {string} value - String value to validate and transform
         * @param {ArgumentMetadata} metadata - NestJS argument metadata containing field information
         * @returns {Promise<Record<string, IPaginationEqual> | undefined>} Pagination filter object or undefined
         */
        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationEqual> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            let finalValue: T;
            if ('isBoolean' in options && options.isBoolean) {
                const booleanString = value.trim();
                if (booleanString !== 'true' && booleanString !== 'false') {
                    throw new BadRequestException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }

                finalValue = (booleanString === 'true') as T;
            } else if ('isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (isNaN(finalValue as number)) {
                    throw new BadRequestException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }
            } else {
                finalValue = value.trim() as T;
            }

            this.addToRequestInstance(
                metadata.data,
                finalValue as string | number | boolean
            );

            const customField = options?.customField ?? metadata.data;

            return {
                [customField]: {
                    equals: finalValue as string | number | boolean,
                },
            };
        }

        addToRequestInstance(
            field: string,
            value: string | number | boolean
        ): void {
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
 * Creates a pipe that validates and transforms string values for not equal filtering.
 * Converts query parameters to database filter format for inequality comparison.
 * @template T - The type of value to validate and transform
 * @param {IPaginationQueryFilterEqualOptions} [options] - Configuration options for type conversion and custom field mapping
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for not equal filtering
 */
export function PaginationQueryFilterNotEqualPipe<T>(
    options?: IPaginationQueryFilterEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms string value into pagination filter object with not equal operator.
         * @param {string} value - String value to validate and transform
         * @param {ArgumentMetadata} metadata - NestJS argument metadata containing field information
         * @returns {Promise<Record<string, IPaginationNotEqual> | undefined>} Pagination filter object or undefined
         */
        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationNotEqual> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            let finalValue: T;
            if ('isBoolean' in options && options.isBoolean) {
                const booleanString = value.trim();
                if (booleanString !== 'true' && booleanString !== 'false') {
                    throw new BadRequestException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }

                finalValue = (booleanString === 'true') as T;
            } else if ('isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (isNaN(finalValue as number)) {
                    throw new BadRequestException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }
            } else {
                finalValue = value.trim() as T;
            }

            this.addToRequestInstance(
                metadata.data,
                finalValue as string | number | boolean
            );

            const customField = options?.customField ?? metadata.data;

            return {
                [customField]: {
                    not: finalValue as string | number | boolean,
                },
            };
        }

        addToRequestInstance(
            field: string,
            value: string | number | boolean
        ): void {
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
 * Creates a pipe that validates and transforms ISO date strings for date filtering.
 * Converts query parameters to database filter format for date range operations.
 * @param {IPaginationQueryFilterDateOptions} [options] - Configuration options for date operations and custom field mapping
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for date filtering
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

        /**
         * Transforms ISO date string into pagination filter object with date operations.
         * @param {string} value - ISO date string to validate and transform
         * @param {ArgumentMetadata} metadata - NestJS argument metadata containing field information
         * @returns {Promise<Record<string, IPaginationDate> | undefined>} Pagination filter object or undefined
         */
        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationDate> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            if (!this.helperService.dateCheckIso(value)) {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.filterInvalidValue,
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

        private addToRequestInstance(field: string, value: Date): void {
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
