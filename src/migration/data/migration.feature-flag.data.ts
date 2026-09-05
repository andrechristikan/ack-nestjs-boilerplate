import { EnumAppEnvironment } from '@app/enums/app.enum';
import { Prisma } from '@generated/prisma-client';

const featureFlagData: Prisma.FeatureFlagCreateInput[] = [
    {
        key: 'loginWithGoogle',
        description: 'Enable login with Google',
        isEnable: true,
        rolloutPercent: 100,
        metadata: {
            signUpAllowed: true,
        },
    },
    {
        key: 'loginWithApple',
        description: 'Enable login with Apple',
        isEnable: true,
        rolloutPercent: 100,
        metadata: {
            signUpAllowed: true,
        },
    },
    {
        key: 'loginWithCredential',
        description: 'Enable login with Credential',
        rolloutPercent: 100,
        isEnable: true,
    },
    {
        key: 'signUp',
        description: 'Enable user sign up',
        rolloutPercent: 100,
        isEnable: true,
    },
    {
        key: 'changePassword',
        description: 'Enable change password feature',
        rolloutPercent: 100,
        isEnable: true,
        metadata: {
            forgotAllowed: true,
        },
    },
    {
        key: 'workspace',
        description:
            'Enable the workspace and project router surface, including invitation and join request',
        rolloutPercent: 100,
        isEnable: true,
        metadata: {
            invitationAllowed: true,
            joinRequestAllowed: true,
        },
    },
];

export const migrationFeatureFlagData: Record<
    EnumAppEnvironment,
    Prisma.FeatureFlagCreateInput[]
> = {
    [EnumAppEnvironment.local]: featureFlagData,
    [EnumAppEnvironment.development]: featureFlagData,
    [EnumAppEnvironment.staging]: featureFlagData,
    [EnumAppEnvironment.production]: featureFlagData,
};
