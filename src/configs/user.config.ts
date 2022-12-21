import { registerAs } from '@nestjs/config';

export default registerAs(
    'user',
    (): Record<string, any> => ({
        uploadPath: '/user',
        mobileNumberCountryCodeAllowed: ['628', '658'],
    })
);
