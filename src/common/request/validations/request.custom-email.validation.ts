import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { MessageService } from 'src/common/message/services/message.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsCustomEmailConstraint implements ValidatorConstraintInterface {
    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly messageService: MessageService
    ) {}

    validate(value: string): boolean {
        const validated = this.helperStringService.checkCustomEmail(value);

        return validated.validated;
    }

    defaultMessage(validationArguments?: ValidationArguments): string {
        const validated = this.helperStringService.checkCustomEmail(
            validationArguments.value
        );

        return this.messageService.setMessage(validated.messagePath);
    }
}

export function IsCustomEmail(validationOptions?: ValidationOptions) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'IsCustomEmail',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsCustomEmailConstraint,
        });
    };
}
