import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';

export interface IOnboardingCreated {
    inputs: IUserCreateWithWorkspaceInput[];
    users: IUser[];
}

export interface IOnboardingSignUp extends IOnboardingCreated {
    emailVerification: IUserVerificationEmailCreate;
}

export interface IOnboardingCreateByAdmin extends IOnboardingCreated {
    passwordString: string;
}

export interface IOnboardingImport extends IOnboardingCreated {
    passwordHasheds: IAuthPassword[];
    passwordStrings: string[];
}
