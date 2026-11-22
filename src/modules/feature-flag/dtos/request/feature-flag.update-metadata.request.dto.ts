import { z } from 'zod';
import { EnumFeatureFlagMetadataKey } from '@modules/feature-flag/enums/feature-flag.enum';
import {
    FeatureFlagMetadataInviteExpiresInDaysSchema,
    FeatureFlagMetadataJoinRequestExpiresInDaysSchema,
    FeatureFlagMetadataMaxWorkspacesPerUserSchema,
    FeatureFlagMetadataMfaLockDurationInMinutesSchema,
    FeatureFlagMetadataMfaMaxAttemptsSchema,
    FeatureFlagMetadataPasskeyMaxPerUserSchema,
    FeatureFlagMetadataPasswordLockDurationInMinutesSchema,
    FeatureFlagMetadataPasswordMaxAttemptsSchema,
} from '@modules/feature-flag/validations/feature-flag.metadata.validation';

/** @public */
export const FeatureFlagUpdateMetadataRequestSchema = z
    .strictObject({
        metadata: z
            .record(
                z
                    .string()
                    .max(64, {
                        error: () => 'featureFlag.error.invalidMetadata',
                    })
                    .regex(/^[a-z][a-zA-Z0-9]*$/, {
                        error: () => 'featureFlag.error.invalidMetadata',
                    }),
                z.union(
                    [
                        z
                            .string()
                            .min(1, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            })
                            .max(500, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            }),
                        z.number(),
                        z.boolean(),
                        z
                            .array(
                                z.string().max(500, {
                                    error: () =>
                                        'featureFlag.error.invalidMetadata',
                                })
                            )
                            .min(1, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            })
                            .max(100, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            }),
                        z
                            .array(z.number())
                            .min(1, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            })
                            .max(100, {
                                error: () =>
                                    'featureFlag.error.invalidMetadata',
                            }),
                    ],
                    { error: () => 'featureFlag.error.invalidMetadata' }
                ),
                { error: () => 'featureFlag.error.invalidMetadata' }
            )
            .refine(metadata => Object.keys(metadata).length <= 50, {
                error: () => 'featureFlag.error.invalidMetadata',
            })
            .meta({
                description:
                    'Feature flag metadata in JSON format: at most 50 keys of 64 characters, string values of 500 characters, arrays of 100 items',
                example: {
                    newFeature: true,
                    betaUserAccess: false,
                    maxRetries: 3,
                    apiEndpoint: 'https://api.example.com',
                    allowedRegions: ['sg', 'id'],
                    rolloutWeights: [10, 20, 70],
                },
            }),
    })
    .superRefine((value, ctx) => {
        for (const [key, metadataValue] of Object.entries(value.metadata)) {
            let schema: z.ZodType | null;
            switch (key) {
                case EnumFeatureFlagMetadataKey.maxWorkspacesPerUser:
                    schema = FeatureFlagMetadataMaxWorkspacesPerUserSchema;
                    break;
                case EnumFeatureFlagMetadataKey.inviteExpiresInDays:
                    schema = FeatureFlagMetadataInviteExpiresInDaysSchema;
                    break;
                case EnumFeatureFlagMetadataKey.joinRequestExpiresInDays:
                    schema = FeatureFlagMetadataJoinRequestExpiresInDaysSchema;
                    break;
                case EnumFeatureFlagMetadataKey.passkeyMaxPerUser:
                    schema = FeatureFlagMetadataPasskeyMaxPerUserSchema;
                    break;
                case EnumFeatureFlagMetadataKey.mfaMaxAttempts:
                    schema = FeatureFlagMetadataMfaMaxAttemptsSchema;
                    break;
                case EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes:
                    schema = FeatureFlagMetadataMfaLockDurationInMinutesSchema;
                    break;
                case EnumFeatureFlagMetadataKey.passwordMaxAttempts:
                    schema = FeatureFlagMetadataPasswordMaxAttemptsSchema;
                    break;
                case EnumFeatureFlagMetadataKey.passwordLockDurationInMinutes:
                    schema =
                        FeatureFlagMetadataPasswordLockDurationInMinutesSchema;
                    break;
                default:
                    schema = null;
            }

            if (schema !== null && !schema.safeParse(metadataValue).success) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['metadata', key],
                    message: 'featureFlag.error.invalidMetadata',
                });
            }
        }
    });

/** @public */
export type FeatureFlagUpdateMetadataRequestDto = z.infer<
    typeof FeatureFlagUpdateMetadataRequestSchema
>;
