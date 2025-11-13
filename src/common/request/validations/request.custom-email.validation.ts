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
 * Custom email validation constraint with enhanced validation and detailed error messaging.
 * Supports optional fields and provides localized error messages.
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
     * @returns True if email is valid or field is optional and empty
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

        if (this.isEmptyValue(value)) {
            return false;
        }

        const validationResult = this.helperService.checkEmail(value);
        return validationResult.validated;
    }

    /**
     * Generates localized error message for invalid email values.
     *
     * @param validationArguments - Validation arguments containing the invalid value
     * @returns Localized error message string
     */
    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.error.email.required';
        }

        const validationResult = this.helperService.checkEmail(
            validationArguments.value
        );
        return validationResult.messagePath ?? 'request.error.email.invalid';
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
 * Custom email validation decorator with enhanced validation.
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
