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
export class IsPasswordMediumConstraint
    implements ValidatorConstraintInterface
{
    constructor(protected readonly helperStringService: HelperStringService) {}

    validate(value: string, args: ValidationArguments): boolean {
        // At least one upper case English letter, (?=.*?[A-Z])
        // At least one lower case English letter, (?=.*?[a-z])
        // At least one digit, (?=.*?[0-9])
        // Minimum eight in length .{8,} (with the anchors)

        const [length] = args.constraints;
        return value
            ? this.helperStringService.checkPasswordMedium(value, length)
            : false;
    }
}

export function IsPasswordMedium(
    minLength = 8,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'IsPasswordMedium',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [minLength],
            validator: IsPasswordMediumConstraint,
        });
    };
}
