import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

/** Validates the 2FA TOTP code format via AuthTwoFactorUtil. */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsTwoFactorCodeConstraint implements ValidatorConstraintInterface {
    constructor(private readonly authTwoFactorUtil: AuthTwoFactorUtil) {}

    validate(value: string): boolean {
        if (this.isEmptyValue(value)) {
            return false;
        }

        return this.authTwoFactorUtil.validateCode(value);
    }

    defaultMessage(): string {
        return 'auth.error.twoFactorCodeRequired';
    }

    private isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }
}

/** Property decorator asserting a valid 2FA TOTP code. */
export function IsTwoFactorCode(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'IsTwoFactorCode',
            target: (object as Record<string, unknown>)?.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTwoFactorCodeConstraint,
        });
    };
}
