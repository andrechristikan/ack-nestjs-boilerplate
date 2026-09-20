import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiHeaders, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import { z } from 'zod';
import type {
    IDocOptions,
    IDocResponseEntry,
    IDocResponseErrorOptions,
} from '@common/doc/interfaces/doc.interface';
import { ResponseSchema } from '@common/response/dtos/response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    DocGlobalErrorResponses,
    DocResponseEntryMetaKey,
} from '@common/doc/constants/doc.constant';
import { faker } from '@faker-js/faker';

/**
 * Documents the responses a status may return, composed with every other entry at that status
 * so a later decorator cannot erase an earlier one. Dedupes by
 * `httpStatus:statusCode:messagePath`. One entry emits a plain schema with field examples;
 * two or more emit one shared envelope schema plus named OpenAPI `examples` keyed by
 * `messagePath`.
 * @public
 */
export function DocResponseError(
    httpStatus: HttpStatus,
    ...entries: IDocResponseErrorOptions[]
): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        if (entries.length === 0) {
            return;
        }

        const incoming: IDocResponseEntry[] = entries.map(entry => ({
            ...entry,
            httpStatus,
        }));

        const method = descriptor.value as object;
        const stored =
            (Reflect.getMetadata(DocResponseEntryMetaKey, method) as
                IDocResponseEntry[] | undefined) ?? [];

        const combined: IDocResponseEntry[] = [...stored];
        const seen = new Set<string>(
            stored.map(
                entry =>
                    `${entry.httpStatus}:${entry.statusCode}:${entry.messagePath}`
            )
        );

        for (const entry of incoming) {
            const key = `${entry.httpStatus}:${entry.statusCode}:${entry.messagePath}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            combined.push(entry);
        }

        Reflect.defineMetadata(DocResponseEntryMetaKey, combined, method);

        const described = new Set<HttpStatus>(
            stored.map(entry => entry.httpStatus)
        );
        const statusEntries = combined.filter(
            entry => entry.httpStatus === httpStatus
        );

        if (statusEntries.length === 0) {
            return;
        }

        const schemas: SchemaObject[] = statusEntries.map(entry => {
            const baseSchema: z.ZodObject = entry.baseSchema ?? ResponseSchema;
            const withData: z.ZodObject = entry.schema
                ? baseSchema.extend({ data: entry.schema })
                : baseSchema;
            const documented = withData.extend({
                message: withData.shape.message.meta({
                    example: entry.messagePath,
                }),
                statusCode: withData.shape.statusCode.meta({
                    example: entry.statusCode ?? HttpStatus.OK,
                }),
            });

            return createSchema(documented, { io: 'output' })
                .schema as SchemaObject;
        });

        const schema: SchemaObject =
            schemas.length > 1
                ? (createSchema(
                      statusEntries[0]?.baseSchema ?? ResponseSchema,
                      { io: 'output' }
                  ).schema as SchemaObject)
                : schemas[0];
        const description = described.has(httpStatus)
            ? ''
            : httpStatus.toString();
        const metadataExample = (
            schema.properties as Record<string, SchemaObject> | undefined
        )?.metadata?.example;
        const examples =
            schemas.length > 1
                ? Object.fromEntries(
                      statusEntries.map(entry => [
                          entry.messagePath,
                          {
                              summary: `${entry.statusCode ?? httpStatus} — ${entry.messagePath}`,
                              value: {
                                  statusCode: entry.statusCode ?? httpStatus,
                                  message: entry.messagePath,
                                  metadata: metadataExample,
                              },
                          },
                      ])
                  )
                : undefined;

        ApiResponse({
            description,
            status: httpStatus,
            schema,
            ...(examples ? { examples } : {}),
        })(target, propertyKey, descriptor);
    };
}

/**
 * Public escape hatch for endpoint-specific module-flow errors.
 * Controllers must not call `DocResponseError` directly — use this.
 * @public
 */
export function DocErrors(
    httpStatus: HttpStatus,
    ...entries: IDocResponseErrorOptions[]
): MethodDecorator {
    return DocResponseError(httpStatus, ...entries);
}

/**
 * Base endpoint doc: operation metadata, language/correlation headers, and the global error
 * responses every endpoint can return.
 * @public
 */
export function Doc(options?: IDocOptions): MethodDecorator {
    return applyDecorators(
        ApiOperation({
            summary: options?.summary,
            deprecated: options?.deprecated,
            description: options?.description,
            operationId: options?.operation,
        }),
        ApiHeaders([
            {
                name: 'x-custom-lang',
                description: 'Custom language header',
                required: false,
                schema: {
                    default: EnumMessageLanguage.en,
                    example: EnumMessageLanguage.en,
                    type: 'string',
                },
            },
            {
                name: 'x-correlation-id',
                description:
                    'Correlation identifier for tracking requests across services',
                required: false,
                schema: {
                    example: faker.string.uuid(),
                    type: 'string',
                },
            },
        ]),
        DocGlobalErrorResponses.internalServerError,
        DocGlobalErrorResponses.requestTimeout,
        DocGlobalErrorResponses.validationError,
        DocGlobalErrorResponses.tooManyRequests,
        DocGlobalErrorResponses.decryptFailed,
        DocGlobalErrorResponses.encryptionSecretInvalid,
        DocGlobalErrorResponses.patternTokenMissing,
        DocGlobalErrorResponses.schemaMissing,
        DocGlobalErrorResponses.contextMissing,
        DocGlobalErrorResponses.uniqueValueGenerationFailed,
        DocGlobalErrorResponses.serviceUnavailable
    );
}
