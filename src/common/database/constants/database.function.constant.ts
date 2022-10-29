import { v4 as uuidV4 } from 'uuid';

export const DatabaseDefaultUUID = function genUUID() {
    return uuidV4();
};
