import { z } from 'zod';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/** @public */
export const ResponseMetadataSchema = z.object({
    language: z.enum(EnumMessageLanguage).meta({
        description: 'Language of the response message',
        example: EnumMessageLanguage.en,
    }),
    timestamp: z.iso.datetime({ offset: true }).meta({
        description: 'Timestamp of the response as an ISO-8601 string',
        example: '2022-08-10T14:22:17.231+07:00',
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
    requestId: z.string().nullable().meta({
        description: 'Unique ID of this request',
        example: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
    }),
    correlationId: z.string().nullable().meta({
        description: 'Correlation ID for distributed tracing',
        example: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
    }),
});

/** @public */
export type ResponseMetadataDto = z.infer<typeof ResponseMetadataSchema>;
