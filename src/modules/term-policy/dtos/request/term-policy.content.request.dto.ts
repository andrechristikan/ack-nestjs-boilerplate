import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

export const TermPolicyContentRequestSchema =
    TermPolicyContentPresignRequestSchema.pick({
        language: true,
        size: true,
    }).extend({
        key: AwsS3PresignRequestSchema.shape.key.meta({
            description: 'Key of the term document in storage',
            example: 'term-policies/privacy/v1/en.hbs',
        }),
    });

export type TermPolicyContentRequestDto = z.infer<
    typeof TermPolicyContentRequestSchema
>;
