import { z } from 'zod';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Per-response context: language, timing, versioning, and request/correlation IDs.
 */
export const ResponseMetadataSchema = z.object({
    language: z.enum(EnumMessageLanguage).meta({
        description: 'Language of the response message',
        example: EnumMessageLanguage.en,
    }),
    timestamp: z.number().meta({
        description: 'Timestamp of the response',
        example: 1660190937231,
    }),
    timezone: z.string().meta({
        description: 'Timezone of the response',
        example: 'Asia/Jakarta',
    }),
    version: z.string().meta({
        description: 'Version of the API',
        example: '1',
    }),
    repoVersion: z.string().meta({
        description: 'Repository version of the application',
        example: '1.0.0',
    }),
    requestId: z.string().meta({
        description: 'Unique ID of this request',
        example: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
    }),
    correlationId: z.string().meta({
        description: 'Correlation ID for distributed tracing',
        example: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
    }),
});

/**
 * Extensible: carries additional metadata fields alongside the declared ones.
 */
export type ResponseMetadataDto = z.infer<typeof ResponseMetadataSchema> &
    Record<string, unknown>;
