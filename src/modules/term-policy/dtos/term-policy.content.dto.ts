import { z } from 'zod';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/** @public */
export const TermPolicyContentSchema = AwsS3ResponseSchema.extend({
    language: z.enum(EnumMessageLanguage).meta({
        description: 'Language of the term document',
        example: EnumMessageLanguage.en,
    }),
});

/** @public */
export type TermPolicyContentDto = z.infer<typeof TermPolicyContentSchema>;
