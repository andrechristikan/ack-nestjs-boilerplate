import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import {
    TERM_POLICY_OPTIONS_META_KEY,
    TERM_POLICY_TYPE_META_KEY,
} from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptedGuard } from '../guards/term-policy-accepted-guard.service';

export interface ITermPolicyOptions {
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
export function TermPolicyAccepted(
    policyType: ENUM_TERM_POLICY_TYPE,
    options: ITermPolicyOptions = {}
): MethodDecorator {
    const defaultOptions: ITermPolicyOptions = {
        requireLatestVersion: true,
        respondWithPolicyDetails: true,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return applyDecorators(
        UseGuards(TermPolicyAcceptedGuard),
        SetMetadata(TERM_POLICY_TYPE_META_KEY, policyType),
        SetMetadata(TERM_POLICY_OPTIONS_META_KEY, mergedOptions)
    );
}
