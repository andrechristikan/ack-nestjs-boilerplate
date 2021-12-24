import { Inject, applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HelperImageInterceptor } from './interceptor/helper.image.interceptor';
import { HelperService } from './helper.service';

export function Helper(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(HelperService);
}

export function Image(field: string): any {
    return applyDecorators(
        UseInterceptors(FileInterceptor(field), HelperImageInterceptor)
    );
}

import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments
} from 'class-validator';

export function IsPasswordStrong(
    minLength = 8,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'IsPasswordStrong',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [minLength],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    // At least one upper case English letter, (?=.*?[A-Z])
                    // At least one lower case English letter, (?=.*?[a-z])
                    // At least one digit, (?=.*?[0-9])
                    // At least one special character, (?=.*?[#?!@$%^&*-])
                    // Minimum eight in length .{8,} (with the anchors)
                    if (typeof value !== 'string') {
                        return false;
                    }

                    const [relatedPropertyName] = args.constraints;

                    const regex = new RegExp(
                        `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{${relatedPropertyName},}$`
                    );
                    return regex.test(value);
                }
            }
        });
    };
}

export function IsPasswordMedium(
    minLength = 8,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'IsPasswordMedium',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [minLength],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    // At least one upper case English letter, (?=.*?[A-Z])
                    // At least one lower case English letter, (?=.*?[a-z])
                    // At least one digit, (?=.*?[0-9])
                    // Minimum eight in length .{8,} (with the anchors)
                    if (typeof value !== 'string') {
                        return false;
                    }

                    const [relatedPropertyName] = args.constraints;

                    const regex = new RegExp(
                        `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${relatedPropertyName},}$`
                    );
                    return regex.test(value);
                }
            }
        });
    };
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
            validator: {
                validate(password: any, args: ValidationArguments) {
                    // At least one upper case English letter, (?=.*?[A-Z])
                    // At least one lower case English letter, (?=.*?[a-z])
                    // Minimum eight in length .{8,} (with the anchors)
                    if (typeof password !== 'string') {
                        return false;
                    }

                    const [relatedPropertyName] = args.constraints;

                    const regex = new RegExp(
                        `^(?=.*?[A-Z])(?=.*?[a-z]).{${relatedPropertyName},}$`
                    );
                    return regex.test(password);
                }
            }
        });
    };
}

export function IsStartWith(
    prefix: string[],
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string): any {
        registerDecorator({
            name: 'IsStartWith',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [prefix],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') {
                        return false;
                    }

                    const [relatedPropertyName] = args.constraints;

                    return relatedPropertyName.every((prf: string) =>
                        value.startsWith(prf)
                    );
                }
            }
        });
    };
}
