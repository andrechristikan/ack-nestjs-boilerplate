import { z } from 'zod';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    ResponseMetadataDto,
    ResponseMetadataSchema,
} from '@common/response/dtos/response.metadata.dto';

/**
 * Standard API response envelope without `data`. A route documenting a payload adds it with
 * `.extend({ data })`.
 */
export const ResponseSchema = z.object({
    statusCode: z.number().meta({
        description: 'return specific status code for every endpoints',
        example: 200,
    }),
    message: z.string().meta({
        description: 'Message base on language',
        example: 'message endpoint',
    }),
    metadata: ResponseMetadataSchema.meta({
        description: 'Contain metadata about API',
        example: {
            language: EnumMessageLanguage.en,
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            version: '1',
            repoVersion: '1.0.0',
            requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
            correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        },
    }),
});

/**
 * Standard API response envelope: statusCode, localized message, metadata, and optional data.
 */
export type ResponseDto<T> = {
    statusCode: number;
    message: string;
    metadata: ResponseMetadataDto;
    data?: T;
};
