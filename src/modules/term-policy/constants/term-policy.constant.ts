import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';

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
