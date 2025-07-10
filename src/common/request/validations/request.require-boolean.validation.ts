import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { MessageService } from '@common/message/services/message.service';

export interface RequireBooleanOptions {
    expectedValue: boolean;
}

@ValidatorConstraint({ async: true })
@Injectable()
export class requireBooleanConstraint implements ValidatorConstraintInterface {
    constructor(private readonly messageService: MessageService) {}

    validate(value: boolean, args: ValidationArguments): boolean {
        const [options] = args.constraints as [RequireBooleanOptions];
        return value === options.expectedValue;
    }
}

/**
 * Generic boolean validator that can check for true or false values.
 * @param expectedValue The boolean value to require (true/false)
 * @param validationOptions class-validator options (including custom message)
 */
export function RequireBoolean(
    expectedValue: boolean,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'requireBoolean',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [{ expectedValue }],
            options: validationOptions,
            validator: requireBooleanConstraint,
        });
    };
}

export function RequireTrue(validationOptions?: ValidationOptions) {
    return RequireBoolean(true, validationOptions);
}

export function RequireFalse(validationOptions?: ValidationOptions) {
    return RequireBoolean(false, validationOptions);
}
