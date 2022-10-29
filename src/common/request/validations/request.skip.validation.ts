import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class SkipConstraint implements ValidatorConstraintInterface {
    validate(): boolean {
        return true;
    }
}

export function Skip() {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'Skip',
            target: object.constructor,
            propertyName: propertyName,
            validator: SkipConstraint,
        });
    };
}
