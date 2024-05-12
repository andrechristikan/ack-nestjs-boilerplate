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
export class LessThanEqualOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [property] = args.constraints;
        const relatedValue = args.object[property];
        return value <= relatedValue;
    }
}

export function LessThanEqualOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'LessThanEqualOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: LessThanEqualOtherPropertyConstraint,
        });
    };
}

@ValidatorConstraint({ async: true })
@Injectable()
export class LessThanOtherPropertyConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [property] = args.constraints;
        const relatedValue = args.object[property];
        return value < relatedValue;
    }
}

export function LessThanOtherProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'LessThanOtherProperty',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: LessThanOtherPropertyConstraint,
        });
    };
}
