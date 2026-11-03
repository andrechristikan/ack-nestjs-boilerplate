import { RequestTrustedProxySchema } from '@common/request/validations/request.trusted-proxy.validation';

describe('RequestTrustedProxySchema', () => {
    it.each([
        'loopback',
        'linklocal',
        'uniquelocal',
        'loopback,uniquelocal',
        'loopback, linklocal',
        '10.0.0.1',
        '::1',
        '10.0.0.0/8',
        'fd00::/8',
        '173.245.48.0/20,103.21.244.0/22',
        'loopback,10.0.0.0/8,::1',
    ])('parses the trusted network list %s', value => {
        expect(RequestTrustedProxySchema.parse(value)).toBe(value);
    });

    it.each(['true', 'false', '1', '2', 'localhost', 'loopbak'])(
        'rejects the hop count, boolean, or unknown name %s',
        value => {
            expect(RequestTrustedProxySchema.safeParse(value).success).toBe(
                false
            );
        }
    );

    it.each(['10.0.0.0/33', '10.0.0.0/255.0.0.0', '10.0.0.999', ','])(
        'rejects the malformed address or CIDR %s',
        value => {
            expect(RequestTrustedProxySchema.safeParse(value).success).toBe(
                false
            );
        }
    );

    it('rejects a list holding an empty entry', () => {
        expect(
            RequestTrustedProxySchema.safeParse('loopback,,uniquelocal').success
        ).toBe(false);
    });

    it('rejects a list holding one valid and one invalid entry', () => {
        expect(
            RequestTrustedProxySchema.safeParse('loopback,true').success
        ).toBe(false);
    });
});
