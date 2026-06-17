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
 * Validates email structure via `HelperService.checkEmail`; passes empty values on optional fields.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsCustomEmailConstraint implements ValidatorConstraintInterface {
    constructor(private readonly helperService: HelperService) {}

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

    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.error.email.required';
        }

        const validationResult = this.helperService.checkEmail(
            validationArguments.value
        );
        return validationResult.messagePath ?? 'request.error.email.invalid';
    }

    private isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }

    /**
     * True when the property carries `@IsOptional`/conditional validation metadata.
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

export function IsCustomEmail(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string): void {
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
