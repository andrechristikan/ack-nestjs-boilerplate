import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.constant';

export const E2E_ROLE_ADMIN_LIST_URL = '/admin/role/list';
export const E2E_ROLE_ADMIN_GET_BY_ID_URL = '/admin/role/get/:_id';
export const E2E_ROLE_ADMIN_CREATE_URL = '/admin/role/create';
export const E2E_ROLE_ADMIN_UPDATE_URL = '/admin/role/update/:_id';
export const E2E_ROLE_ADMIN_DELETE_URL = '/admin/role/delete/:_id';
export const E2E_ROLE_ADMIN_INACTIVE_URL = '/admin/role/update/:_id/inactive';
export const E2E_ROLE_ADMIN_ACTIVE_URL = '/admin/role/update/:_id/active';

export const E2E_ROLE_PAYLOAD_TEST = {
    role: {
        name: 'superadmin',
        isActive: true,
        accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
        permissions: [],
    },
    phoneNumber: '628123123112',
    email: 'test@kadence.com',
    _id: '613ee8e5b2fdd012b94484ca',
    user: '6141b7d9b8822a162d427323',
    rememberMe: false,
    loginWith: 'EMAIL',
    isActive: true,
    verification: { email: true, phoneNumber: true },
    agreement: {
        tnc: true,
    },
    signUpFrom: 'MOBILE',
    signUpDate: '2021-9-13',
};
