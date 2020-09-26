import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin,
} from '@nestjs/common';
import {
    ObjectSchema,
    object as jfObject,
    string as jfString,
    date as jfDate,
    boolean as jfBoolean,
    number as jfNumber,
    array as jfArray,
} from '@hapi/joi';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';

export function RequestValidationPipe(
    schema: Record<string, any>,
): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(
            @Language() private readonly languageService: LanguageService,
            @Error() private readonly errorService: ErrorService,
        ) {}

        async transform(
            value: Record<string, any>,
            { metatype }: ArgumentMetadata,
        ): Promise<Record<string, any>> {
            if (!metatype || !this.toValidate(metatype)) {
                return value;
            }

            const validator: ObjectSchema = this.buildSchema(schema);
            const messages: Record<
                string,
                string
            > = this.languageService.getAll('request');
            const { error } = validator.validate(value, {
                abortEarly: false,
                messages: messages,
            });

            if (error) {
                const errors = this.errorService.requestApiError(error);
                throw new BadRequestException(errors);
            }
            return value;
        }

        private toValidate(metatype: Record<string, any>): boolean {
            const types: Record<string, any>[] = [
                String,
                Boolean,
                Number,
                Array,
                Object,
            ];
            return types.includes(metatype);
        }

        private buildSchema(value: Record<string, any>): ObjectSchema {
            const newSchema = {};
            for (const property in value) {
                switch (value[property].type) {
                    case 'base64':
                        newSchema[property] = jfString().base64({
                            urlSafe: true,
                        });
                        break;
                    case 'domain':
                        newSchema[property] = jfString().domain({
                            allowUnicode: false,
                            tlds: { allow: true },
                        });
                        break;
                    case 'hex':
                        newSchema[property] = jfString().hex({
                            byteAligned: false,
                        });
                        break;
                    case 'uuid':
                        newSchema[property] = jfString().uuid({
                            version: ['uuidv5', 'uuidv4'],
                        });
                        break;
                    case 'ip':
                        newSchema[property] = jfString().ip({
                            version: 'ipv4',
                        });
                        break;
                    case 'time':
                        newSchema[property] = jfString().isoDuration();
                        break;
                    case 'token':
                        newSchema[property] = jfString().token();
                        break;
                    case 'email':
                        newSchema[property] = jfString().email({
                            allowUnicode: false,
                            ignoreLength: false,
                            multiple: true,
                            separator: ';',
                            tlds: { allow: true },
                        });
                        break;
                    case 'port':
                        newSchema[property] = jfNumber().port();
                        break;
                    case 'string':
                        newSchema[property] = jfString();

                        if (value[property].lowercase) {
                            newSchema[property] = newSchema[property].case(
                                'lower',
                            );
                        }

                        if (value[property].uppercase) {
                            newSchema[property] = newSchema[property].case(
                                'upper',
                            );
                        }

                        if (value[property].alphanumeric) {
                            newSchema[property] = newSchema[
                                property
                            ].alphanum();
                        }

                        if (value[property].insensitive) {
                            newSchema[property] = newSchema[
                                property
                            ].insensitive();
                        }

                        if (value[property].max > 0) {
                            newSchema[property] = newSchema[property].max(
                                value[property].max,
                            );
                        }

                        if (value[property].min > 0) {
                            newSchema[property] = newSchema[property].min(
                                value[property].min,
                            );
                        }
                        break;
                    case 'date':
                        newSchema[property] = jfDate()
                            .iso()
                            .timestamp('unix');

                        if (newSchema[property].greater) {
                            newSchema[property] = newSchema[property].greater(
                                newSchema[property].greater,
                            );
                        }
                        if (newSchema[property].less) {
                            newSchema[property] = newSchema[property].less(
                                newSchema[property].less,
                            );
                        }
                        break;
                    case 'boolean':
                        newSchema[property] = jfBoolean();
                        break;
                    case 'number':
                        newSchema[property] = jfNumber();

                        if (newSchema[property].float) {
                            newSchema[property] = newSchema[property].integer();
                        }
                        if (newSchema[property].negative) {
                            newSchema[property] = newSchema[
                                property
                            ].negative();
                        }
                        if (newSchema[property].positive) {
                            newSchema[property] = newSchema[
                                property
                            ].positive();
                        }
                        if (newSchema[property].greater) {
                            newSchema[property] = newSchema[property].greater(
                                newSchema[property].greater,
                            );
                        }
                        if (newSchema[property].less) {
                            newSchema[property] = newSchema[property].less(
                                newSchema[property].less,
                            );
                        }
                        if (newSchema[property].min) {
                            newSchema[property] = newSchema[property].min(
                                newSchema[property].min,
                            );
                        }
                        if (newSchema[property].max) {
                            newSchema[property] = newSchema[property].max(
                                newSchema[property].max,
                            );
                        }
                        break;
                    case 'array':
                        newSchema[property] = jfArray();

                        if (newSchema[property].length) {
                            newSchema[property] = newSchema[property].length(
                                newSchema[property].length,
                            );
                        }

                        if (newSchema[property].min) {
                            newSchema[property] = newSchema[property].min(
                                newSchema[property].min,
                            );
                        }

                        if (newSchema[property].max) {
                            newSchema[property] = newSchema[property].max(
                                newSchema[property].max,
                            );
                        }

                        if (newSchema[property].unique) {
                            newSchema[property] = newSchema[property].unique(
                                newSchema[property].unique,
                            );
                        }

                        if (newSchema[property].sort) {
                            newSchema[property] = newSchema[property].sort({
                                order: newSchema[property].sort,
                            });
                        }

                        break;
                    default:
                        newSchema[property] = jfString();
                        break;
                }

                if (value[property].required) {
                    newSchema[property] = newSchema[property].required();
                }
            }
            return jfObject(newSchema);
        }
    }

    return mixin(MixinRequestValidationPipe);
}
