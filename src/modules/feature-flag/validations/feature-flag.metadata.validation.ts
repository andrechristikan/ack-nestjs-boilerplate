import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/** Accepts only a flat object whose values are string, number, or boolean. */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsFeatureFlagMetadataConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (
            value === null ||
            value === undefined ||
            typeof value !== 'object'
        ) {
            return false;
        }

        const setting = value as Record<string, unknown>;

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
        return `featureFlag.error.invalidMetadata`;
    }
}

export function IsFeatureFlagMetadata(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            target: (object as Record<string, unknown>)?.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsFeatureFlagMetadataConstraint,
        });
    };
}
