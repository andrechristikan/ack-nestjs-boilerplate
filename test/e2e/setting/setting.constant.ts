import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';

export const E2E_SETTING_COMMON_LIST_URL = '/setting/list';
export const E2E_SETTING_COMMON_GET_URL = '/setting/get/:_id';
export const E2E_SETTING_COMMON_GET_BY_NAME_URL =
    '/setting/get/name/:settingName';

export const E2E_SETTING_ADMIN_UPDATE_URL = '/admin/setting/update/:_id';

export const E2E_SETTING_ADMIN_PAYLOAD_TEST = {
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
