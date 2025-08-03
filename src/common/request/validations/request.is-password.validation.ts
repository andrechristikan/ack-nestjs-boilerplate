import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsPasswordConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperService: HelperService) {}

    validate(value: string): boolean {
        return value ? this.helperService.checkPasswordStrength(value) : false;
    }
}

export function IsPassword(validationOptions?: ValidationOptions) {
    return function (object: Record<string, void>, propertyName: string): void {
        registerDecorator({
            name: 'IsPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPasswordConstraint,
        });
    };
}
