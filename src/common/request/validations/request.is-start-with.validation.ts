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
export class IsStartWithConstraint implements ValidatorConstraintInterface {
    validate(value: string, args: ValidationArguments): boolean {
        const [prefix] = args.constraints;
        return value
            ? prefix.every((prf: string) => value.startsWith(prf))
            : false;
    }
}

export function IsStartWith(
    prefix: string[],
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'IsStartWith',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [prefix],
            validator: IsStartWithConstraint,
        });
    };
}
