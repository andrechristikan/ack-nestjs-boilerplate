import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
@Injectable()
export class IsFeatureFlagValueConstraint
    implements ValidatorConstraintInterface
{
    validate(value: unknown): boolean {
        if (
            value === null ||
            value === undefined ||
            typeof value !== 'object'
        ) {
            return false;
        }

        const setting = value as Record<string, unknown>;

        // check key-value pairs
        for (const key in setting) {
            if (typeof key !== 'string') {
                return false;
            }

            const val = setting[key];
            const valType = typeof val;

            if (
                valType !== 'string' &&
                valType !== 'number' &&
                valType !== 'boolean'
            ) {
                return false;
            }
        }

        return true;
    }

    defaultMessage(): string {
        return `featureFlag.error.invalidValue`;
    }
}

export function IsFeatureFlagValue(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsFeatureFlagValueConstraint,
        });
    };
}
