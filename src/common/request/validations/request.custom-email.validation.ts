import { Injectable } from '@nestjs/common';
import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    getMetadataStorage,
    registerDecorator,
} from 'class-validator';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Custom email validation constraint that provides enhanced email validation
 * with detailed error messaging and support for optional fields.
 *
 * This validator performs comprehensive email validation including:
 * - Basic email format validation
 * - Domain validation (length, format, TLD requirements)
 * - Local part validation (length, character restrictions)
 * - Support for optional email fields
 * - Localized error messages
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsCustomEmailConstraint implements ValidatorConstraintInterface {
    constructor(private readonly helperService: HelperService) {}

    /**
     * Validates the email value using comprehensive email validation rules.
     *
     * @param value - The email string to validate
     * @param validationArguments - Optional validation arguments containing context
     * @returns True if the email is valid or if the field is optional and empty, false otherwise
     */
    validate(
        value: string,
        validationArguments?: ValidationArguments
    ): boolean {
        if (
            this.isEmptyValue(value) &&
            this.isPropertyOptional(validationArguments)
        ) {
            return true;
        }

        // Validate non-empty values
        if (this.isEmptyValue(value)) {
            return false;
        }

        const validationResult = this.helperService.checkEmail(value);
        return validationResult.validated;
    }

    /**
     * Generates a localized error message for invalid email values.
     *
     * @param validationArguments - Validation arguments containing the invalid value
     * @returns Localized error message string
     */
    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.email.required';
        }

        const validationResult = this.helperService.checkEmail(
            validationArguments.value
        );
        return validationResult.messagePath || 'request.email.invalid';
    }

    /**
     * Checks if a value is considered empty (null, undefined, or empty string).
     *
     * @param value - The value to check
     * @returns True if the value is empty, false otherwise
     */
    private isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }

    /**
     * Determines if a property is marked as optional using validation decorators.
     *
     * @param validationArguments - Validation arguments containing property metadata
     * @returns True if the property is optional, false otherwise
     */
    private isPropertyOptional(
        validationArguments?: ValidationArguments
    ): boolean {
        if (!validationArguments?.object || !validationArguments?.property) {
            return false;
        }

        try {
            const validationMetadatas =
                getMetadataStorage().getTargetValidationMetadatas(
                    validationArguments.object.constructor,
                    '',
                    false,
                    false
                );

            return validationMetadatas.some(
                metadata =>
                    metadata.propertyName === validationArguments.property &&
                    (metadata.type === 'conditionalValidation' ||
                        metadata.type === 'isOptional')
            );
        } catch (_error) {
            return false;
        }
    }
}

/**
 * Custom email validation decorator that provides enhanced email validation.
 *
 * This decorator applies comprehensive email validation using the IsCustomEmailConstraint.
 * It supports all standard ValidationOptions and provides detailed, localized error messages.
 *
 * @param validationOptions - Standard class-validator validation options
 * @returns Property decorator function
 */
export function IsCustomEmail(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'IsCustomEmail',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsCustomEmailConstraint,
        });
    };
}
