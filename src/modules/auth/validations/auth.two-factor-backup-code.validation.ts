import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

/** Validates the 2FA backup code format via AuthTwoFactorUtil. */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsTwoFactorBackupCodeConstraint implements ValidatorConstraintInterface {
    constructor(private readonly authTwoFactorUtil: AuthTwoFactorUtil) {}

    validate(value: string): boolean {
        if (this.isEmptyValue(value)) {
            return false;
        }

        return this.authTwoFactorUtil.validateBackupCode(value);
    }

    defaultMessage(): string {
        return 'auth.error.twoFactorCodeRequired';
    }

    private isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }
}

/** Property decorator asserting a valid 2FA backup code. */
export function IsTwoFactorBackupCode(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'IsTwoFactorBackupCode',
            target: (object as Record<string, unknown>)?.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTwoFactorBackupCodeConstraint,
        });
    };
}
