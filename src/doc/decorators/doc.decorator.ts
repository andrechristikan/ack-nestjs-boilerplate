import { applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiConsumes,
    ApiExtraModels,
    ApiHeader,
    ApiOkResponse,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiSecurity,
    getSchemaPath,
} from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { AppLanguage } from 'src/app/constants/app.constant';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
import { ResponsePagingSerialization } from 'src/common/response/serializations/response.paging.serialization';
import {
    IDocDefaultHeaderOptions,
    IDocsOptions,
} from 'src/doc/interfaces/doc.interface';

export function DocRequestHeader(options?: IDocDefaultHeaderOptions): any {
    return applyDecorators(
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language header',
            required: false,
            schema: {
                default: AppLanguage,
                example: Object.values(ENUM_MESSAGE_LANGUAGE).join(','),
                type: 'array',
                items: {
                    type: 'string',
                    enum: Object.values(ENUM_MESSAGE_LANGUAGE),
                },
            },
        }),
        ApiHeader({
            name: 'x-timezone',
            description: 'Custom timezone header',
            required: false,
            schema: {
                example: 'Asia/Jakarta',
                type: 'string',
            },
        }),
        ApiHeader({
            name: 'user-agent',
            description: 'User agent header',
            required: true,
            schema: {
                example:
                    'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion',
                type: 'string',
            },
        }),
        ApiHeader({
            name: 'x-timestamp',
            description: 'Timestamp header, in microseconds',
            required: true,
            schema: {
                example: 1662876305642,
                type: 'number',
            },
        }),
        ApiConsumes(
            options && options.isRequestMultipart
                ? 'multipart/form-data'
                : 'application/json'
        ),
        ApiProduces(
            options && options.isResponseFile
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/json'
        )
    );
}

export function DocDefaultSerialization<T>(
    serialization?: ClassConstructor<T>
) {
    return applyDecorators(
        ApiExtraModels(serialization ? serialization : undefined),
        ApiExtraModels(ResponseDefaultSerialization),
        ApiOkResponse({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponseDefaultSerialization<T>) },
                    serialization
                        ? {
                              properties: {
                                  data: {
                                      $ref: getSchemaPath(serialization),
                                  },
                              },
                          }
                        : undefined,
                ],
            },
        })
    );
}

export function DocPagingSerialization<T>(serialization?: ClassConstructor<T>) {
    return applyDecorators(
        ApiExtraModels(serialization ? serialization : undefined),
        ApiExtraModels(ResponsePagingSerialization),
        ApiOkResponse({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponsePagingSerialization<T>) },
                    serialization
                        ? {
                              properties: {
                                  data: {
                                      type: 'array',
                                      items: {
                                          $ref: getSchemaPath(serialization),
                                      },
                                  },
                              },
                          }
                        : undefined,
                ],
            },
        })
    );
}

export function Doc<T>(options?: IDocsOptions<T>): any {
    const finalDocs = [];

    if (options && options.params) {
        for (const param of options.params) {
            finalDocs.push(ApiParam(param));
        }
    }

    if (options && options.queries) {
        for (const query of options.queries) {
            finalDocs.push(ApiQuery(query));
        }
    }

    if (options && options.jwt) {
        if (options.jwt.refreshToken) {
            finalDocs.push(ApiBearerAuth('refreshToken'));
        } else if (options.jwt.accessToken) {
            finalDocs.push(ApiBearerAuth('accessToken'));
        }
    }

    if (options && options.apiKey) {
        finalDocs.push(ApiSecurity('apiKey'));
    }

    return applyDecorators(
        DocRequestHeader(
            options && options.header ? options.header : undefined
        ),
        DocDefaultSerialization<T>(
            options && options.response
                ? options.response.serialization
                : undefined
        ),
        ...finalDocs
    );
}

export function DocPaging<T>(options?: IDocsOptions<T>): any {
    const finalDocs = [
        ApiQuery({
            name: 'search',
            required: false,
            allowEmptyValue: true,
            type: 'string',
            description:
                'Search will base on availableSearch with rule contains, and case insensitive',
        }),
        ApiQuery({
            name: 'perPage',
            required: true,
            allowEmptyValue: false,
            example: 20,
            type: 'number',
            description: 'Data per page',
        }),
        ApiQuery({
            name: 'page',
            required: true,
            allowEmptyValue: false,
            example: 1,
            type: 'number',
            description: 'page number',
        }),
        ApiQuery({
            name: 'sort',
            required: true,
            allowEmptyValue: false,
            example: 'createdAt@desc',
            type: 'string',
            description: 'Sort base on availableSort, type is `asc` and `desc`',
        }),
    ];

    if (options && options.params) {
        for (const param of options.params) {
            finalDocs.push(ApiParam(param));
        }
    }

    if (options && options.queries) {
        for (const query of options.queries) {
            finalDocs.push(ApiQuery(query));
        }
    }

    if (options && options.jwt) {
        if (options.jwt.refreshToken) {
            finalDocs.push(ApiBearerAuth('refreshToken'));
        } else if (options.jwt.accessToken) {
            finalDocs.push(ApiBearerAuth('accessToken'));
        }
    }

    if (options && options.apiKey) {
        finalDocs.push(ApiSecurity('apiKey'));
    }

    return applyDecorators(
        DocRequestHeader(
            options && options.header ? options.header : undefined
        ),
        DocPagingSerialization<T>(
            options && options.response
                ? options.response.serialization
                : undefined
        ),
        ...finalDocs
    );
}

// .set('Authorization', `Bearer ${accessToken}`)
// .set('x-api-key', xApiKey)
