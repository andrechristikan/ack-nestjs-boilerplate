import { z } from 'zod';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';
import { UserSchema } from '@modules/user/dtos/user.dto';
import { UserMobileNumberResponseSchema } from '@modules/user/dtos/response/user.mobile-number.response.dto';

/** @public */
export const UserProfileResponseSchema = UserSchema.extend({
    country: CountryResponseSchema.meta({
        description: 'Country of the user',
    }),
    mobileNumbers: z.array(UserMobileNumberResponseSchema).meta({
        description: 'Mobile numbers registered to the user',
        example: [],
    }),
});

/** @public */
export type UserProfileResponseDto = z.infer<typeof UserProfileResponseSchema>;
