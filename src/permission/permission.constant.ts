export enum PermissionList {
    // User
    UserCreate = 'UserCreate',
    UserUpdate = 'UserUpdate',
    UserRead = 'UserRead',
    UserDelete = 'UserDelete',

    // Profile
    ProfileUpdate = 'ProfileUpdate',
    ProfileRead = 'ProfileRead',

    // Role
    RoleCreate = 'RoleCreate',
    RoleUpdate = 'RoleUpdate',
    RoleRead = 'RoleRead',
    RoleDelete = 'RoleDelete',

    // Permission
    PermissionCreate = 'PermissionCreate',
    PermissionUpdate = 'PermissionCreate',
    PermissionRead = 'PermissionCreate',
    PermissionDelete = 'PermissionCreate'
}

export const PERMISSION_META_KEY = 'permissionsMetaKey';
