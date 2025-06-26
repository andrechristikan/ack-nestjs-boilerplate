import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import {
    TERMS_POLICY_OPTIONS_META_KEY,
    TERMS_POLICY_TYPE_META_KEY,
} from '@modules/terms-policy/constants/terms-policy.constant';
import { TermsPolicyAcceptedGuard } from '../guards/terms-policy-accepted.guard';

export interface ITermsPolicyOptions {
    /**
     * If true, ensures the user has accepted the latest version of the policy
     * If false, any accepted version is valid (default: true)
     */
    requireLatestVersion?: boolean;

    /**
     * If true, throws a specific error with policy details to help frontend redirect
     * If false, throws a generic forbidden error (default: true)
     */
    respondWithPolicyDetails?: boolean;
}

/**
 * Ensures the authenticated user has accepted the policy of specified type
 * @param policyType The type of policy that must be accepted
 * @param options Configuration options for the guard behavior
 */
export function TermsPolicyAccepted(
    policyType: ENUM_TERMS_POLICY_TYPE,
    options: ITermsPolicyOptions = {}
): MethodDecorator {
    const defaultOptions: ITermsPolicyOptions = {
        requireLatestVersion: true,
        respondWithPolicyDetails: true,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return applyDecorators(
        UseGuards(TermsPolicyAcceptedGuard),
        SetMetadata(TERMS_POLICY_TYPE_META_KEY, policyType),
        SetMetadata(TERMS_POLICY_OPTIONS_META_KEY, mergedOptions)
    );
}
