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
export class MaxGreaterThanEqualConstraint
    implements ValidatorConstraintInterface
{
    validate(value: string, args: ValidationArguments): boolean {
        const [property] = args.constraints;
        const relatedValue = args.object[property];
        return value <= relatedValue;
    }
}

export function MaxGreaterThanEqual(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'MaxGreaterThanEqual',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: MaxGreaterThanEqualConstraint,
        });
    };
}
