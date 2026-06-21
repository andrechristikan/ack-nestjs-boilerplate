import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/**
 * Validates a number/date value is `>=` another property's value.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class GreaterThanEqualOtherPropertyConstraint implements ValidatorConstraintInterface {
    constructor(private readonly helperService: HelperService) {}

    validate(value: unknown, args: ValidationArguments): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        const [property] = args.constraints;
        if (!property || !args.object) {
            return false;
        }

        const relatedValue = (args.object as Record<string, unknown>)[property];

        if (relatedValue === null || relatedValue === undefined) {
            return false;
        }

        const dateValue = this.convertToDate(value);
        const dateRelatedValue = this.convertToDate(relatedValue);

        if (dateValue !== null && dateRelatedValue !== null) {
            return dateValue.getTime() >= dateRelatedValue.getTime();
        }

        const numValue = this.convertToNumber(value);
        const numRelatedValue = this.convertToNumber(relatedValue);

        if (numValue !== null && numRelatedValue !== null) {
            return numValue >= numRelatedValue;
        }

        return false;
    }

    defaultMessage(): string {
        return `request.error.greaterThanEqualOtherProperty.invalid`;
    }

    private convertToNumber(value: unknown): number | null {
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const converted = Number(value);
            return !Number.isNaN(converted) ? converted : null;
        }

        return null;
    }

    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
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

export function GreaterThanEqualOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: object, propertyName: string): void {
        registerDecorator({
            name: 'GreaterThanEqualOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: GreaterThanEqualOtherPropertyConstraint,
        });
    };
}

/**
 * Validates a number/date value is strictly `>` another property's value.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class GreaterThanOtherPropertyConstraint implements ValidatorConstraintInterface {
    constructor(private readonly helperService: HelperService) {}

    validate(value: unknown, args: ValidationArguments): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        const [property] = args.constraints;
        if (!property || !args.object) {
            return false;
        }

        const relatedValue = (args.object as Record<string, unknown>)[property];

        if (relatedValue === null || relatedValue === undefined) {
            return false;
        }

        const dateValue = this.convertToDate(value);
        const dateRelatedValue = this.convertToDate(relatedValue);

        if (dateValue !== null && dateRelatedValue !== null) {
            return dateValue.getTime() > dateRelatedValue.getTime();
        }

        const numValue = this.convertToNumber(value);
        const numRelatedValue = this.convertToNumber(relatedValue);

        if (numValue !== null && numRelatedValue !== null) {
            return numValue > numRelatedValue;
        }

        return false;
    }

    defaultMessage(): string {
        return `request.error.greaterThanOtherProperty.invalid`;
    }

    private convertToNumber(value: unknown): number | null {
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const converted = Number(value);
            return !Number.isNaN(converted) ? converted : null;
        }

        return null;
    }

    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
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

export function GreaterThanOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: object, propertyName: string): void {
        registerDecorator({
            name: 'GreaterThanOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: GreaterThanOtherPropertyConstraint,
        });
    };
}
