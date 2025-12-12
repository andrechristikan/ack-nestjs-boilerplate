import { Injectable } from '@nestjs/common';
import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/**
 * Validator constraint that checks if a value is less than or equal to another property's value.
 * Supports numbers and dates comparison.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class LessThanEqualOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    /**
     * Validates that the current value is less than or equal to the related property value.
     *
     * @param value - The value to validate (numbers and dates only)
     * @param args - Validation arguments containing constraints and object context
     * @returns True if value is less than or equal to the related property
     */
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
            return dateValue.getTime() <= dateRelatedValue.getTime();
        }

        const numValue = this.convertToNumber(value);
        const numRelatedValue = this.convertToNumber(relatedValue);

        if (numValue !== null && numRelatedValue !== null) {
            return numValue <= numRelatedValue;
        }

        return false;
    }

    /**
     * Generates a default error message for validation failures.
     *
     * @returns Error message string
     */
    defaultMessage(): string {
        return `request.lessThanEqualOtherProperty`;
    }

    /**
     * Converts a value to number if possible, returns null if conversion fails.
     *
     * @param value - Value to convert
     * @returns Converted number or null if conversion fails
     */
    private convertToNumber(value: unknown): number | null {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const converted = Number(value);
            return !isNaN(converted) ? converted : null;
        }

        return null;
    }

    /**
     * Converts a value to Date if possible, returns null if conversion fails.
     *
     * @param value - Value to convert (Date object, ISO string, timestamp)
     * @returns Converted Date or null if conversion fails
     */
    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date && !isNaN(value.getTime())) {
            return value;
        }

        if (typeof value === 'string') {
            const date = new Date(value);
            return !isNaN(date.getTime()) ? date : null;
        }

        if (typeof value === 'number') {
            const date = new Date(value);
            return !isNaN(date.getTime()) ? date : null;
        }

        return null;
    }
}

/**
 * Decorator that validates a property is less than or equal to another property's value.
 *
 * @param property - The name of the property to compare against
 * @param validationOptions - Standard class-validator validation options
 * @returns Property decorator function
 */
export function LessThanEqualOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'LessThanEqualOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: LessThanEqualOtherPropertyConstraint,
        });
    };
}

/**
 * Validator constraint that checks if a value is strictly less than another property's value.
 * Supports numbers and dates comparison.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class LessThanOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    /**
     * Validates that the current value is strictly less than the related property value.
     *
     * @param value - The value to validate (numbers and dates only)
     * @param args - Validation arguments containing constraints and object context
     * @returns True if value is less than the related property
     */
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
            return dateValue.getTime() < dateRelatedValue.getTime();
        }

        const numValue = this.convertToNumber(value);
        const numRelatedValue = this.convertToNumber(relatedValue);

        if (numValue !== null && numRelatedValue !== null) {
            return numValue < numRelatedValue;
        }

        return false;
    }

    /**
     * Generates a default error message for validation failures.
     *
     * @returns Error message string
     */
    defaultMessage(): string {
        return `request.lessThanOtherProperty`;
    }

    /**
     * Converts a value to number if possible, returns null if conversion fails.
     *
     * @param value - Value to convert
     * @returns Converted number or null if conversion fails
     */
    private convertToNumber(value: unknown): number | null {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const converted = Number(value);
            return !isNaN(converted) ? converted : null;
        }

        return null;
    }

    /**
     * Converts a value to Date if possible, returns null if conversion fails.
     *
     * @param value - Value to convert (Date object, ISO string, timestamp)
     * @returns Converted Date or null if conversion fails
     */
    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date && !isNaN(value.getTime())) {
            return value;
        }

        if (typeof value === 'string') {
            const date = new Date(value);
            return !isNaN(date.getTime()) ? date : null;
        }

        if (typeof value === 'number') {
            const date = new Date(value);
            return !isNaN(date.getTime()) ? date : null;
        }

        return null;
    }
}

/**
 * Decorator that validates a property is strictly less than another property's value.
 *
 * @param property - The name of the property to compare against
 * @param validationOptions - Standard class-validator validation options
 * @returns Property decorator function
 */
export function LessThanOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'LessThanOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: LessThanOtherPropertyConstraint,
        });
    };
}
