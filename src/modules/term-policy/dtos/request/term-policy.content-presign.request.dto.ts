import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';

/**
 * Validates the body that requests a presigned term policy content upload.
 * @public
 */
export const TermPolicyContentPresignRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        type: TermPolicyAcceptRequestSchema.shape.type,
        language: z.enum(EnumMessageLanguage).meta({
            description: 'Language of the term document',
            example: EnumMessageLanguage.en,
        }),
        version: z.number().int().meta({
            description: 'Version of the terms policy',
            example: 1,
        }),
    });

/**
 * Body that requests a presigned term policy content upload.
 * @public
 */
export type TermPolicyContentPresignRequestDto = z.infer<
    typeof TermPolicyContentPresignRequestSchema
>;
