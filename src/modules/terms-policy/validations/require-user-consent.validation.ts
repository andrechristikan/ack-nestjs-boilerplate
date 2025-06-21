import { ValidationOptions } from 'class-validator';
import { RequireTrue } from '@common/request/validations/request.require-boolean.validation';

export function RequireUserAgreement(validationOptions?: ValidationOptions) {
    return RequireTrue({
        //FIXME: The message override specified here, is not currently being picked up by the current AppValidationFilter
        message: 'legal.error.requireAgreement',
        ...validationOptions,
    });
}
