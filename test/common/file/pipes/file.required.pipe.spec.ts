import type { ArgumentMetadata } from '@nestjs/common';

import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import { FileRequiredPipe } from '@common/file/pipes/file.required.pipe';

describe('FileRequiredPipe', () => {
    const pipe = new (FileRequiredPipe())();
    const metadata: ArgumentMetadata = { type: 'body' };

    it.each([undefined, null, '', false, {}, []])(
        'rejects the empty value %j',
        value => {
            expect(() => pipe.transform(value, metadata)).toThrow(
                FileRequiredException
            );
        }
    );

    it.each([{ fieldname: 'file' }, [{ fieldname: 'file' }]])(
        'returns a non-empty upload unchanged',
        value => {
            expect(pipe.transform(value, metadata)).toBe(value);
        }
    );
});
