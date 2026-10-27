/**
 * Status codes raised by the `workspace` module.
 * @public
 */
export enum EnumWorkspaceStatusCodeError {
    notFound = 51600,
    memberForbidden = 51601,
    inviteInvalid = 51602,
    capReached = 51603,
    slugAlreadyExists = 51604,
    memberNotFound = 51605,
    lastOwner = 51606,
    memberPeerForbidden = 51607,
    inviteDuplicate = 51608,
    inviteProjectMismatch = 51609,
    inviteRoleRequired = 51610,
    inviteNotFound = 51611,
    inviteAlreadyProcessed = 51612,
    notPublic = 51613,
    joinRequestAlreadyMember = 51614,
    joinRequestDuplicate = 51615,
    joinRequestNotFound = 51616,
    joinRequestAlreadyProcessed = 51617,
    selfTransfer = 51618,
    slugInvalid = 51619,
    ownerRoleNotAssignable = 51620,
}
