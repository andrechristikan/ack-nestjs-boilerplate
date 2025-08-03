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
 * Custom password validation constraint that validates password strength
 * based on configurable security requirements.
 *
 * This validator enforces password strength requirements including:
 * - Minimum length (default: 8 characters)
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - Customizable length requirements via options
 *
 * The validation uses the HelperService.checkPasswordStrength method
 * which applies a regex pattern to ensure password complexity.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsPasswordConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperService: HelperService) {}

    /**
     * Validates the password value against strength requirements.
     *
     * @param value - The password string to validate
     * @param validationArguments - Optional validation arguments containing constraints
     * @returns True if the password meets strength requirements, false otherwise
     */
    validate(
        value: string,
        validationArguments?: ValidationArguments
    ): boolean {
        // Return false for empty, null, or undefined values
        if (!value || typeof value !== 'string') {
            return false;
        }

        // Extract minimum length from constraints if provided
        const minLength = validationArguments?.constraints?.[0];
        const options = minLength ? { length: minLength } : undefined;

        return this.helperService.checkPasswordStrength(value, options);
    }

    /**
     * Generates an appropriate error message for invalid passwords.
     *
     * @param validationArguments - Validation arguments containing the invalid value
     * @returns Localized error message key
     */
    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.required';
        }

        // Return a generic password strength message
        // The actual strength level could be determined by additional logic if needed
        return 'request.isPasswordStrong';
    }
}

/**
 * Password validation decorator that validates password strength requirements.
 *
 * This decorator applies password strength validation to a property, ensuring it meets
 * security requirements including minimum length, character diversity, and complexity.
 *
 * @param minLength - Optional minimum password length (defaults to 8 characters)
 * @param validationOptions - Optional class-validator validation options
 * @returns Property decorator function
 */
export function IsPassword(
    minLength?: number,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, void>, propertyName: string): void {
        registerDecorator({
            name: 'IsPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: minLength ? [minLength] : [],
            validator: IsPasswordConstraint,
        });
    };
}
