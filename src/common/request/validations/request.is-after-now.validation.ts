import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/**
 * Validates a date (Date, ISO string, or timestamp) is in the future.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsAfterNowConstraint implements ValidatorConstraintInterface {
    constructor(private readonly helperService: HelperService) {}

    validate(value: unknown): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        const dateValue = this.convertToDate(value);

        if (dateValue === null) {
            return false;
        }

        const now = this.helperService.dateCreate();
        return dateValue.getTime() > now.getTime();
    }

    defaultMessage(): string {
        return `request.error.isAfterNow.invalid`;
    }

    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date) {
            return !Number.isNaN(value.getTime()) ? value : null;
        }

        if (typeof value === 'string') {
            const date = this.helperService.dateCreateFromIso(value);
            return !Number.isNaN(date.getTime()) ? date : null;
        }

        if (typeof value === 'number') {
            const date = this.helperService.dateCreateFromTimestamp(value);
            return !Number.isNaN(date.getTime()) ? date : null;
        }

        return null;
    }
}

export function IsAfterNow(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string): void {
        registerDecorator({
            name: 'IsAfterNow',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsAfterNowConstraint,
        });
    };
}
