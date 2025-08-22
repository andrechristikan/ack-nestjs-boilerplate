import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/**
 * Validator constraint that checks if a date value is after the current date and time.
 * Supports Date objects, ISO strings, and timestamps.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsAfterNowConstraint implements ValidatorConstraintInterface {
    /**
     * Validates that the current value is after the current date and time.
     *
     * @param value - The value to validate (Date objects, ISO strings, timestamps)
     * @returns True if value is after current date and time
     */
    validate(value: unknown): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        const dateValue = this.convertToDate(value);

        if (dateValue === null) {
            return false;
        }

        const now = new Date();
        return dateValue.getTime() > now.getTime();
    }

    /**
     * Generates a default error message for validation failures.
     *
     * @param args - Validation arguments containing property information
     * @returns Error message string
     */
    defaultMessage(): string {
        return `request.isAfterNow`;
    }

    /**
     * Converts a value to Date if possible, returns null if conversion fails.
     * Supports Date objects, ISO date strings, and numeric timestamps.
     *
     * @param value - Value to convert (Date object, ISO string, timestamp)
     * @returns Converted Date or null if conversion fails or invalid
     */
    private convertToDate(value: unknown): Date | null {
        if (value instanceof Date) {
            return !isNaN(value.getTime()) ? value : null;
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
 * Decorator that validates a property is a date after the current date and time.
 *
 * @param validationOptions - Standard class-validator validation options
 * @returns Property decorator function
 */
export function IsAfterNow(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
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
