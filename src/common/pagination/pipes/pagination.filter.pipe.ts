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
 * Pipe validating a comma-separated value against an enum and emitting an `in` filter.
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
                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.filterInvalidValue,
                    message: `pagination.error.filterInvalidValueEnum`,
                    messageProperties: {
                        property: metadata.data,
                        allowedValues: defaultEnum.join(', '),
                    },
                });
            }

            const field = metadata.data!;
            this.addToRequestInstance(field, finalValue);

            const customField = options?.customField ?? field;
            return {
                [customField]: {
                    in: finalValue,
                },
            };
        }

        private addToRequestInstance(
            field: string,
            value: (string | number)[]
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                filters: this.request.pagination?.filters
                    ? {
                          ...this.request.pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
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
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterNinEnumPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
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
                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.filterInvalidValue,
                    message: `pagination.error.filterInvalidValueEnum`,
                    messageProperties: {
                        property: metadata.data,
                        allowedValues: defaultEnum.join(', '),
                    },
                });
            }

            const field = metadata.data!;
            this.addToRequestInstance(field, finalValue);

            const customField = options?.customField ?? field;
            return {
                [customField]: {
                    notIn: finalValue,
                },
            };
        }

        private addToRequestInstance(
            field: string,
            value: (string | number)[]
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                filters: this.request.pagination?.filters
                    ? {
                          ...this.request.pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
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
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

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
                    throw new UnprocessableEntityException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }

                finalValue = (booleanString === 'true') as T;
            } else if (options && 'isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (Number.isNaN(finalValue as number)) {
                    throw new UnprocessableEntityException({
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

            const field = metadata.data!;
            this.addToRequestInstance(
                field,
                finalValue as string | number | boolean
            );

            const customField = options?.customField ?? field;

            return {
                [customField]: {
                    equals: finalValue as string | number | boolean,
                },
            };
        }

        private addToRequestInstance(
            field: string,
            value: string | number | boolean
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                filters: this.request.pagination?.filters
                    ? {
                          ...this.request.pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
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
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterNotEqualPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

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
                    throw new UnprocessableEntityException({
                        statusCode:
                            EnumPaginationStatusCodeError.filterInvalidValue,
                        message: `pagination.error.filterInvalidValue`,
                        messageProperties: {
                            property: metadata.data,
                        },
                    });
                }

                finalValue = (booleanString === 'true') as T;
            } else if (options && 'isNumber' in options && options.isNumber) {
                finalValue = Number.parseFloat(value.trim()) as T;

                if (Number.isNaN(finalValue as number)) {
                    throw new UnprocessableEntityException({
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

            const field = metadata.data!;
            this.addToRequestInstance(
                field,
                finalValue as string | number | boolean
            );

            const customField = options?.customField ?? field;

            return {
                [customField]: {
                    not: finalValue as string | number | boolean,
                },
            };
        }

        private addToRequestInstance(
            field: string,
            value: string | number | boolean
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                filters: this.request.pagination?.filters
                    ? {
                          ...this.request.pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
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
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) private readonly request: IRequestApp,
            private readonly helperService: HelperService
        ) {}

        async transform(
            value: string,
            metadata: ArgumentMetadata
        ): Promise<Record<string, IPaginationDate> | undefined> {
            if (!value || value.trim() === '') {
                return;
            }

            if (!this.helperService.dateCheckIso(value)) {
                throw new UnprocessableEntityException({
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

            const field = metadata.data!;
            this.addToRequestInstance(field, finalValue);

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

        private addToRequestInstance(field: string, value: Date): void {
            this.request.pagination = {
                ...this.request.pagination,
                filters: this.request.pagination?.filters
                    ? {
                          ...this.request.pagination?.filters,
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
