import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class DateGreaterThanEqualConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [date] = args.constraints;
        return value >= date;
    }
}

export function DateGreaterThanEqual(
    date: Date,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'DateGreaterThanEqual',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [date],
            validator: DateGreaterThanEqualConstraint,
        });
    };
}

@ValidatorConstraint({ async: true })
@Injectable()
export class DateGreaterThanConstraint implements ValidatorConstraintInterface {
    validate(value: string, args: ValidationArguments): boolean {
        const [date] = args.constraints;
        return value > date;
    }
}

export function DateGreaterThan(
    date: Date,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'DateGreaterThan',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [date],
            validator: DateGreaterThanConstraint,
        });
    };
}
