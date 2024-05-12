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
export class DateLessThanEqualConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [date] = args.constraints;
        return value <= date;
    }
}

export function DateLessThanEqual(
    date: Date,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'DateLessThanEqual',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [date],
            validator: DateLessThanEqualConstraint,
        });
    };
}

@ValidatorConstraint({ async: true })
@Injectable()
export class DateLessThanConstraint implements ValidatorConstraintInterface {
    validate(value: string, args: ValidationArguments): boolean {
        const [date] = args.constraints;
        return value < date;
    }
}

export function DateLessThan(
    date: Date,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'DateLessThan',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [date],
            validator: DateLessThanConstraint,
        });
    };
}
