import { EnumAppEnvironment } from '@app/enums/app.enum';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';

const FeatureFlagData: Prisma.FeatureFlagCreateInput[] = [
    {
        key: EnumFeatureFlagKey.loginWithGoogle,
        description: 'Enable login with Google',
        isEnable: true,
        rolloutPercent: 100,
        metadata: {
            [EnumFeatureFlagMetadataKey.signUpAllowed]: true,
        },
    },
    {
        key: EnumFeatureFlagKey.loginWithApple,
        description: 'Enable login with Apple',
        isEnable: true,
        rolloutPercent: 100,
        metadata: {
            [EnumFeatureFlagMetadataKey.signUpAllowed]: true,
        },
    },
    {
        key: EnumFeatureFlagKey.loginWithCredential,
        description: 'Enable login with Credential',
        rolloutPercent: 100,
        isEnable: true,
    },
    {
        key: EnumFeatureFlagKey.signUp,
        description: 'Enable user sign up',
        rolloutPercent: 100,
        isEnable: true,
    },
    {
        key: EnumFeatureFlagKey.changePassword,
        description: 'Enable change password feature',
        rolloutPercent: 100,
        isEnable: true,
        metadata: {
            [EnumFeatureFlagMetadataKey.forgotAllowed]: true,
        },
    },
    {
        key: EnumFeatureFlagKey.workspace,
        description:
            'Enable the workspace and project router surface, including invitation and join request',
        rolloutPercent: 100,
        isEnable: true,
        metadata: {
            [EnumFeatureFlagMetadataKey.invitationAllowed]: true,
            [EnumFeatureFlagMetadataKey.joinRequestAllowed]: true,
        },
    },
];

export const MigrationFeatureFlagData: Record<
    EnumAppEnvironment,
    Prisma.FeatureFlagCreateInput[]
> = {
    [EnumAppEnvironment.local]: FeatureFlagData,
    [EnumAppEnvironment.development]: FeatureFlagData,
    [EnumAppEnvironment.staging]: FeatureFlagData,
    [EnumAppEnvironment.production]: FeatureFlagData,
};
