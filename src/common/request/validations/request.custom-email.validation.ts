import { Injectable } from '@nestjs/common';
import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    getMetadataStorage,
    registerDecorator,
} from 'class-validator';
import { MessageService } from '@common/message/services/message.service';
import { HelperService } from '@common/helper/services/helper.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsCustomEmailConstraint implements ValidatorConstraintInterface {
    constructor(
        private readonly helperService: HelperService,
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

        const validated = this.helperService.checkEmail(value);

        return validated.validated;
    }

    defaultMessage(validationArguments?: ValidationArguments): string {
        const validated = this.helperService.checkEmail(
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
    return function (object: Record<string, void>, propertyName: string): void {
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
