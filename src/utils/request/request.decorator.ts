import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import { IResult } from 'ua-parser-js';
import { IRequestApp } from './request.interface';

export const UserAgent = createParamDecorator(
    (data: string, ctx: ExecutionContext): IResult => {
        const { userAgent } = ctx.switchToHttp().getRequest() as IRequestApp;
        return userAgent;
    }
);

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
                },
            },
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
                },
            },
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
                },
            },
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
                },
            },
        });
    };
}

export function MinGreaterThan(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'MinGreaterThan',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value > relatedValue;
                },
            },
        });
    };
}

export function MaxGreaterThan(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'MaxGreaterThan',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value < relatedValue;
                },
            },
        });
    };
}

export function MinGreaterThanEqual(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'MinGreaterThanEqual',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value >= relatedValue;
                },
            },
        });
    };
}

export function MaxGreaterThanEqual(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function (object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'MaxGreaterThanEqual',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value <= relatedValue;
                },
            },
        });
    };
}
