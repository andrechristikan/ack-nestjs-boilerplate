import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

/**
 * Custom validator for 2FA backup code format and value.
 * Uses AuthTwoFactorUtil for format validation.
 */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsTwoFactorBackupCodeConstraint implements ValidatorConstraintInterface {
    constructor(private readonly authTwoFactorUtil: AuthTwoFactorUtil) {}

    /**
     * Validate the backup code format using AuthTwoFactorUtil
     */
    validate(value: string): boolean {
        if (this.isEmptyValue(value)) {
            return false;
        }
        return this.authTwoFactorUtil.validateBackupCode(value);
    }

    /**
     * Default error message for invalid backup code
     */
    defaultMessage(): string {
        return 'auth.error.twoFactorCodeRequired';
    }

    /**
     * Check if value is empty
     */
    private isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }
}

/**
 * Decorator for validating 2FA backup code on DTO property
 */
export function IsTwoFactorBackupCode(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'IsTwoFactorBackupCode',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTwoFactorBackupCodeConstraint,
        });
    };
}
