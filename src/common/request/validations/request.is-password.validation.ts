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
 * Custom password validation constraint that validates password strength.
 * Enforces minimum length, uppercase, lowercase, and digit requirements.
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
     * @returns True if password meets strength requirements
     */
    validate(
        value: string,
        validationArguments?: ValidationArguments
    ): boolean {
        if (!value || typeof value !== 'string') {
            return false;
        }

        const minLength = validationArguments?.constraints?.[0];
        const options = minLength ? { length: minLength } : undefined;

        return this.helperService.checkPasswordStrength(value, options);
    }

    /**
     * Generates appropriate error message for invalid passwords.
     *
     * @param validationArguments - Validation arguments containing the invalid value
     * @returns Localized error message key
     */
    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.error.required';
        }

        return 'request.error.isPasswordStrong';
    }
}

/**
 * Password validation decorator that validates password strength requirements.
 *
 * @param minLength - Optional minimum password length (defaults to 8 characters)
 * @param validationOptions - Optional class-validator validation options
 * @returns Property decorator function
 */
export function IsPassword(
    minLength?: number,
    validationOptions?: ValidationOptions
) {
    return function (object: unknown, propertyName: string): void {
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
