import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsOnlyDigitsConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperNumberService: HelperNumberService) {}

    validate(value: string): boolean {
        return value ? this.helperNumberService.check(value) : false;
    }
}

export function IsOnlyDigits(validationOptions?: ValidationOptions) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'IsOnlyDigits',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsOnlyDigitsConstraint,
        });
    };
}
