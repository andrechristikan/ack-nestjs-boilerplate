import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin,
} from '@nestjs/common';
import {
    ObjectSchema,
    object as jfObject,
    string as jfString,
} from '@hapi/joi';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';

export function RequestValidationPipe(
    schema: Record<string, any>,
): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(
            @Language() private readonly languageService: LanguageService,
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
                throw new BadRequestException('Validation failed');
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
                if (
                    value[property].type === 'string' ||
                    value[property].type === 'base64' ||
                    value[property].type === 'email' ||
                    value[property].type === 'domain' ||
                    value[property].type === 'uuid' ||
                    value[property].type === 'hex' ||
                    value[property].type === 'ip' ||
                    value[property].type === 'time' ||
                    value[property].type === 'token'
                ) {
                    newSchema[property] = jfString();

                    if (value[property].type === 'base64') {
                        newSchema[property] = newSchema[property].base64(true);
                    } else if (value[property].type === 'domain') {
                        newSchema[property] = newSchema[property].domain({
                            allow: true,
                        });
                    } else if (value[property].type === 'email') {
                        newSchema[property] = newSchema[property].email({
                            allowUnicode: false,
                            ignoreLength: false,
                            multiple: true,
                            separator: ';',
                            tlds: { allow: true },
                        });
                    } else if (value[property].type === 'uuid') {
                        newSchema[property] = newSchema[property].uuid(
                            'uuidv5',
                        );
                    } else if (value[property].type === 'hex') {
                        newSchema[property] = newSchema[property].hex(false);
                    } else if (value[property].type === 'ip') {
                        newSchema[property] = newSchema[property].ip({
                            version: 'ipv4',
                        });
                    } else if (value[property].type === 'time') {
                        newSchema[property] = newSchema[property].isoDuration();
                    } else if (value[property].type === 'token') {
                        newSchema[property] = newSchema[property].token();
                    } else {
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

                        if (value[property].required) {
                            newSchema[property] = newSchema[
                                property
                            ].required();
                        }
                    }
                }
            }
            return jfObject(newSchema);
        }
    }

    return mixin(MixinRequestValidationPipe);
}
