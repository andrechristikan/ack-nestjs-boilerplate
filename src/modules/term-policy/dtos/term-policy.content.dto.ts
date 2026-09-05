import { z } from 'zod';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Nested value object: one localized term or policy document stored in S3.
 */
export const TermContentSchema = AwsS3ResponseSchema.extend({
    language: z.enum(EnumMessageLanguage).meta({
        description: 'Language of the term document',
        example: EnumMessageLanguage.en,
    }),
});

export type TermContentDto = z.infer<typeof TermContentSchema>;
