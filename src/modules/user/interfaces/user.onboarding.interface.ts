import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';

export interface IUserOnboardingCreated {
    inputs: IUserCreateWithWorkspaceInput[];
    users: IUser[];
}
