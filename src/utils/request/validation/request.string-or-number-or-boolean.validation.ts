import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { HelperStringService } from 'src/utils/helper/service/helper.string.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class StringOrNumberOrBooleanConstraint
    implements ValidatorConstraintInterface
{
    constructor(protected readonly helperStringService: HelperStringService) {}

    validate(value: string): boolean {
        if (typeof value === 'boolean') {
            return true;
        }

        return value
            ? this.helperStringService.checkStringOrNumber(value)
            : false;
    }
}

export function StringOrNumberOrBoolean(validationOptions?: ValidationOptions) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'StringOrNumberOrBoolean',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: StringOrNumberOrBooleanConstraint,
        });
    };
}
