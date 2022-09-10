import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';

export const E2E_AUTH_INFO_URL = '/auth/info';

export const E2E_AUTH_PAYLOAD_TEST = {
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
