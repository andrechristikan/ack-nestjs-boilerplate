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
 * Validates password strength (length, uppercase, lowercase, digit) via `HelperService`.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsPasswordConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperService: HelperService) {}

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

    defaultMessage(validationArguments?: ValidationArguments): string {
        if (!validationArguments?.value) {
            return 'request.error.isPassword.required';
        }

        return 'request.error.isPassword.strong';
    }
}

export function IsPassword(
    minLength?: number,
    validationOptions?: ValidationOptions
) {
    return function (object: object, propertyName: string): void {
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
