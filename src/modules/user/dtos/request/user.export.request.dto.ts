import { z } from 'zod';
import { UserListRequestSchema } from '@modules/user/dtos/request/user.list.request.dto';

/** @public */
export const UserExportRequestSchema = z.strictObject(
    UserListRequestSchema.pick({
        status: true,
        roleId: true,
        countryId: true,
    }).shape
);

/** @public */
export type UserExportRequestDto = z.infer<typeof UserExportRequestSchema>;
