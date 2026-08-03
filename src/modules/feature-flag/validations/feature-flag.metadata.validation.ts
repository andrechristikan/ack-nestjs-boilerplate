import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

/** Accepts only a flat object with camelCase keys whose values are a string, number, boolean, or a homogeneous string[] / number[]. */
@ValidatorConstraint({ async: false })
@Injectable()
export class IsFeatureFlagMetadataConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (
            value === null ||
            value === undefined ||
            typeof value !== 'object' ||
            Array.isArray(value)
        ) {
            return false;
        }

        const setting = value as Record<string, unknown>;
        const keyPattern = /^[a-z][a-zA-Z0-9]*$/;

        for (const key in setting) {
            if (!keyPattern.test(key)) {
                return false;
            }

            if (!this.isValidValue(setting[key])) {
                return false;
            }
        }

        return true;
    }

    private isValidValue(val: unknown): boolean {
        if (Array.isArray(val)) {
            return (
                val.every(item => typeof item === 'string') ||
                val.every(item => typeof item === 'number')
            );
        }

        const valType = typeof val;

        return (
            valType === 'string' ||
            valType === 'number' ||
            valType === 'boolean'
        );
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
