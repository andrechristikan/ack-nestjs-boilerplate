import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';

export const E2E_USER_ADMIN_LIST_URL = '/admin/user/list';
export const E2E_USER_ADMIN_GET_URL = '/admin/user/get/:_id';
export const E2E_USER_ADMIN_ACTIVE_URL = '/admin/user/update/:_id/active';
export const E2E_USER_ADMIN_INACTIVE_URL = '/admin/user/update/:_id/inactive';
export const E2E_USER_ADMIN_CREATE_URL = '/admin/user/create';
export const E2E_USER_ADMIN_UPDATE_URL = '/admin/user/update/:_id';
export const E2E_USER_ADMIN_DELETE_URL = '/admin/user/delete/:_id';

export const E2E_USER_PROFILE_URL = '/user/profile';
export const E2E_USER_PROFILE_UPLOAD_URL = '/user/profile/upload';
export const E2E_USER_LOGIN_URL = '/user/login';
export const E2E_USER_REFRESH_URL = '/user/refresh';
export const E2E_USER_CHANGE_PASSWORD_URL = '/user/change-password';
export const E2E_USER_INFO = '/user/info';

export const E2E_USER_PUBLIC_SIGN_UP_URL = '/public/user/sign-up';

export const E2E_USER_PAYLOAD_TEST = {
    role: {
        name: 'superadmin',
        isActive: true,
        accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
        permissions: [],
    },
    phoneNumber: '628121231241',
    email: 'test@mail.com',
    _id: '613ee8e5b2fdd012b94484ca',
    rememberMe: false,
    isActive: true,
};
