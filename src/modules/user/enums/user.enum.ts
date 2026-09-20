/**
 * Workspace a new user lands in: a personal one or an invited one.
 * @public
 */
export enum EnumUserSignUpWorkspaceContextType {
    personal = 'personal',
    invite = 'invite',
}

/**
 * Ways a user account is created: sign-up, social sign-in or by an admin.
 * @public
 */
export enum EnumUserCreateMode {
    signUp = 'signUp',
    social = 'social',
    admin = 'admin',
}
