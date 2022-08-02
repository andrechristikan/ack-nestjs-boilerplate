import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsPasswordWeakConstraint implements ValidatorConstraintInterface {
    constructor(protected readonly helperStringService: HelperStringService) {}

    validate(value: string, args: ValidationArguments): boolean {
        // At least one upper case English letter, (?=.*?[A-Z])
        // At least one lower case English letter, (?=.*?[a-z])
        // Minimum eight in length .{8,} (with the anchors)

        const [length] = args.constraints;
        return value
            ? this.helperStringService.checkPasswordMedium(value, length)
            : false;
    }
}

export function IsPasswordWeak(
    minLength = 8,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'IsPasswordWeak',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [minLength],
            validator: IsPasswordWeakConstraint,
        });
    };
}
