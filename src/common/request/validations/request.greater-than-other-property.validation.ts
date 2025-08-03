import { Injectable } from '@nestjs/common';
import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class GreaterThanEqualOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [property] = args.constraints;
        const relatedValue = args.object[property];
        return value >= relatedValue;
    }
}

export function GreaterThanEqualOtherProperty<T>(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: T, propertyName: string): void {
        registerDecorator({
            name: 'GreaterThanEqualOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: GreaterThanEqualOtherPropertyConstraint,
        });
    };
}

@ValidatorConstraint({ async: true })
@Injectable()
export class GreaterThanOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [property] = args.constraints;
        const relatedValue = args.object[property];
        return value > relatedValue;
    }
}

export function GreaterThanOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, void>, propertyName: string): void {
        registerDecorator({
            name: 'GreaterThanOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: GreaterThanOtherPropertyConstraint,
        });
    };
}
