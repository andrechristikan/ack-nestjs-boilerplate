import { EnumTermPolicyType, User } from '@generated/prisma-client';

export const TermPolicyRequiredGuardMetaKey = 'TermPolicyRequiredMetaKey';

export const TermPolicyAcceptedColumnMap: Record<
    EnumTermPolicyType,
    keyof User
> = {
    [EnumTermPolicyType.termsOfService]: 'termsOfServiceAccepted',
    [EnumTermPolicyType.privacy]: 'privacyAccepted',
    [EnumTermPolicyType.cookies]: 'cookiesAccepted',
    [EnumTermPolicyType.marketing]: 'marketingAccepted',
};
