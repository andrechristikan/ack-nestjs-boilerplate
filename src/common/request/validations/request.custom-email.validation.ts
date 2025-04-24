import { Injectable } from '@nestjs/common';
import {
    getMetadataStorage,
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

    validate(
        value: string,
        validationArguments?: ValidationArguments
    ): boolean {
        if (
            (value === null || value === undefined || value === '') &&
            this.isPropertyOptional(validationArguments)
        ) {
            return true;
        }

        const validated = this.helperStringService.checkCustomEmail(value);

        return validated.validated;
    }

    defaultMessage(validationArguments?: ValidationArguments): string {
        const validated = this.helperStringService.checkCustomEmail(
            validationArguments.value
        );

        return this.messageService.setMessage(validated.messagePath);
    }

    private isPropertyOptional(
        validationArguments?: ValidationArguments
    ): boolean {
        if (!validationArguments || !validationArguments.object) {
            return false;
        }

        // Access the validation metadata
        const validationMetadatas =
            getMetadataStorage().getTargetValidationMetadatas(
                validationArguments.object.constructor,
                '', // Property name is empty string to get all properties
                false,
                false
            );

        // Find optional decorators on this property
        return validationMetadatas.some(
            metadata =>
                metadata.propertyName === validationArguments.property &&
                metadata.type === 'conditionalValidation'
        );
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
