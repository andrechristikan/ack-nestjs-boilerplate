import { z } from 'zod';

/** @public */
export const FeatureFlagMetadataMaxWorkspacesPerUserSchema = z
    .number()
    .int()
    .min(1)
    .max(100);

/** @public */
export const FeatureFlagMetadataPasskeyMaxPerUserSchema = z
    .number()
    .int()
    .min(1)
    .max(20);

/** @public */
export const FeatureFlagMetadataInviteExpiresInDaysSchema = z
    .number()
    .int()
    .min(1)
    .max(30);

/** @public */
export const FeatureFlagMetadataJoinRequestExpiresInDaysSchema = z
    .number()
    .int()
    .min(1)
    .max(30);

/** @public */
export const FeatureFlagMetadataPasswordMaxAttemptsSchema = z
    .number()
    .int()
    .min(3)
    .max(10);

/** @public */
export const FeatureFlagMetadataMfaMaxAttemptsSchema = z
    .number()
    .int()
    .min(3)
    .max(10);

/** @public */
export const FeatureFlagMetadataPasswordLockDurationInMinutesSchema = z
    .number()
    .int()
    .min(5)
    .max(1440);

/** @public */
export const FeatureFlagMetadataMfaLockDurationInMinutesSchema = z
    .number()
    .int()
    .min(5)
    .max(1440);
