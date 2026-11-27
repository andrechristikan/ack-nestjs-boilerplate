---
title: Helper Reference
description: Every public method of the array, date, encryption, hash, number, and string helper services, with what it takes and returns.
---

# Helper Reference

This page lists the helper API in `src/common/helper/services/`, for a developer who looks up a method before writing one.

## Table of Contents

- [Related Documents](#related-documents)
- [Injecting the helpers](#injecting-the-helpers)
- [HelperArrayService](#helperarrayservice)
- [HelperDateService](#helperdateservice)
    - [Create and read](#create-and-read)
    - [Calculate](#calculate)
    - [Check, read, and format](#check-read-and-format)
- [HelperEncryptionService](#helperencryptionservice)
- [HelperHashService](#helperhashservice)
- [HelperNumberService](#helpernumberservice)
- [HelperStringService](#helperstringservice)
- [Helper exceptions](#helper-exceptions)

## Related Documents

- [Architecture][ref-doc-architecture]: the kit level the helpers sit on
- [Cache][ref-doc-concept-cache]: `fillPattern` builds every cache key
- [Security][ref-doc-concept-security]: where the hash and encryption helpers are used
- [Status Codes][ref-doc-reference-status-codes-helper]: the numeric code and message of each helper exception
- [Configuration Reference][ref-doc-reference-configuration-helper]: the `helper` keys

## Injecting the helpers

`HelperModule.forRoot()` is a global kit module that provides and exports the six services, so a util, a service, and a use case inject them without an import. The services hold no state beyond their config. Every method returns its value directly, except `argon2Hash` and `argon2Compare`, which return a `Promise`.

## HelperArrayService

| Method | Takes | Returns |
| --- | --- | --- |
| `unique(array)` | an array | a new array without duplicate values |
| `shuffle(array)` | an array | a new array in random order |
| `chunk(a, size)` | an array and a size | a new array of arrays, each holding at most `size` items |
| `intersection(a, b)` | two arrays | a new array of the values that appear in both, in the order of `a` |

## HelperDateService

The methods that create, set, move, read, or format a date work in the timezone `app.timezone`. `createDuration` and `diff` return a Luxon `Duration`, which carries no timezone, and `getZone(date)` returns the name of `app.timezone`. A `Date` argument is the instant, and a result `Date` is the instant the method computes.

### Create and read

| Method | Takes | Returns |
| --- | --- | --- |
| `now(options?)` | `{ dayOf? }` | the current time as a new `Date` |
| `create(date, options?)` | a `Date`, `{ dayOf? }` | a new `Date` for the given date, never the clock |
| `createFromIso(iso, options?)` | an ISO string, `{ dayOf? }` | a `Date` |
| `createFromTimestamp(timestamp, options?)` | milliseconds, `{ dayOf? }` | a `Date` |
| `createDuration(duration)` | a Luxon duration object such as `{ milliseconds: 500 }` | a Luxon `Duration` |

`dayOf` is `EnumHelperDateDayOf.start` or `EnumHelperDateDayOf.end`. It moves the result to the start of that day (`00:00:00.000`) or to its end (`23:59:59.999`) in `app.timezone`, and an absent `dayOf` leaves the instant as it is.

### Calculate

| Method | Takes | Returns |
| --- | --- | --- |
| `set(date, units)` | a `Date` and Luxon `DateObjectUnits` | the date with those units set |
| `forward(date, duration)` | a `Date` and a `Duration` | the date plus the duration |
| `backward(date, duration)` | a `Date` and a `Duration` | the date minus the duration |
| `diff(dateOne, dateTwo)` | two `Date` values | the `Duration` `dateOne` minus `dateTwo` |
| `calculateAge(dateOfBirth, fromYear)` | a `Date` and a year or `null` | the `Duration` from the start of the day of birth to the start of tomorrow. When `fromYear` is not `null`, the end point is the start of tomorrow's month and day in `fromYear` |

### Check, read, and format

| Method | Takes | Returns |
| --- | --- | --- |
| `checkIso(date)` | a string | `true` for a valid ISO date |
| `checkTimestamp(timestamp)` | milliseconds | `true` for a valid timestamp |
| `getZone(date)` | a `Date` | the timezone name |
| `getZoneOffset(date)` | a `Date` | the short offset name Luxon gives for `app.timezone` at that instant, such as `GMT+7`, or `UTC` when there is none |
| `getHour(date)` | a `Date` | the hour, 0 to 23 |
| `getTimestamp(date)` | a `Date` | milliseconds since the epoch |
| `formatToIso(date)` | a `Date` | an ISO 8601 string |
| `formatToIsoDate(date)` | a `Date` | the ISO date, `YYYY-MM-DD` |
| `formatToIsoTime(date)` | a `Date` | the ISO time with its offset |
| `formatToRfc2822(date)` | a `Date` | an RFC 2822 string |

## HelperEncryptionService

| Method | Takes | Returns |
| --- | --- | --- |
| `aes256Encrypt(plaintext, secret, purpose, context)` | the text, the secret, a purpose string, a context string | a payload `salt.iv.ciphertext.authTag`, each part base64url |
| `aes256Decrypt(payload, secret, purpose, context)` | a payload, and the same secret, purpose, and context | the plaintext |
| `derBase64ToPem(der, label)` | a base64 DER key and an `EnumHelperPemLabel` (`PRIVATE KEY` or `PUBLIC KEY`) | the PEM text, after it parses as a key of that kind. A value that does not parse throws the Node `crypto` error from `createPrivateKey` or `createPublicKey`, not a helper exception |

- The cipher is AES-256-GCM. The secret is a base64url string that decodes to 48 bytes, or the call throws `HelperEncryptionSecretInvalidException`.
- Each call derives its key with HKDF-SHA256 from the secret, a random 16-byte salt, and `purpose` as the info, so one secret serves many purposes. The IV is 12 random bytes and the tag is 16 bytes.
- `context` is the additional authenticated data. A payload decrypts only with the context it was encrypted with.
- `aes256Decrypt` throws `HelperDecryptFailedException` for a payload that is malformed, tampered with, or decrypted with another secret, purpose, or context.

## HelperHashService

| Method | Takes | Returns |
| --- | --- | --- |
| `argon2Hash(value)` | a string | a `Promise` of an Argon2id hash in PHC form, `$argon2id$v=19$m=...,t=...,p=...$salt$tag` |
| `argon2Compare(value, hash)` | a string and a PHC hash | a `Promise` of `true` when the value matches the hash, and of `false` when it does not match or the hash is not in PHC form |
| `sha256Hash(value)` | a string | the SHA-256 digest as hex |
| `sha256Compare(hashOne, hashTwo)` | two hex strings | `true` when they are equal, compared in constant time |

`argon2Hash` reads `helper.argon2`, values the config file fixes and no environment variable sets: memory `19mb` read by the `bytes` package as 19 MiB (`m=19456` in the hash, in KiB), 2 passes, parallelism 1, a 16-byte salt, and a 32-byte tag. `argon2Compare` uses the parameters stored in the hash it receives.

## HelperNumberService

| Method | Takes | Returns |
| --- | --- | --- |
| `checkString(number)` | a string | `true` for an optional minus sign and digits |
| `randomDigits(length)` | a length | a string of `length` random digits with no leading zero |
| `randomInRange(min, max)` | two numbers | a random integer from `min` up to, and not including, `max` |
| `calculatePercent(value, total)` | two numbers | `value / total` as a percent rounded to two decimals. A `total` of `0` gives `0` for any `value`, because `NaN` and an infinite ratio become `0` |
| `percent(part, total)` | two numbers | `part / total` as an unrounded percent, and `0` when `total` is `0` |

The random methods use `node:crypto`.

## HelperStringService

| Method | Takes | Returns |
| --- | --- | --- |
| `random(length)` | a length | a random string of `A-Z`, `a-z`, and `0-9` |
| `randomUppercase(length)` | a length | a random string of `A-Z` and `0-9` |
| `fillPattern(pattern, values)` | a pattern with `{token}` placeholders and a map of values | the pattern with each token replaced in one pass |
| `stripLeadingSlashes(path)` | a path | the path without its leading slashes |
| `generateSlug(prefix, maxLength)` | a prefix and a total length | the prefix plus a random suffix of `maxLength` minus the prefix length characters, so the slug is exactly `maxLength` characters long. The whole slug, the prefix included, is lower-cased |
| `generateSlugCandidates(prefix, maxLength, count)` | the same, and a count | `count` slugs, each from its own `generateSlug` call. The slugs are not checked for distinctness |
| `censor(text)` | a string | the text masked by its length: up to 5 characters, `*` for all but the last character; 6 to 10 characters, `*` for all but the last 3; longer, the first 3 characters, ten `*`, and the last 4 |
| `censorMobileNumber(mobileNumber)` | a string | the first 4 and the last 2 characters kept, `*` in between, and all `*` up to 6 characters |
| `censorEmail(email)` | an email address | the local part masked as `censorMobileNumber` does, then `@`, the first character of the domain, and `*` for each remaining character of the domain |

`fillPattern` scans the pattern once, so a substituted value is never read as a token. A token with no entry in `values` throws `HelperPatternTokenMissingException`.

## Helper exceptions

| Exception | HTTP status | Thrown by |
| --- | --- | --- |
| `HelperDecryptFailedException` | 500 | `aes256Decrypt` |
| `HelperEncryptionSecretInvalidException` | 500 | `aes256Encrypt` and `aes256Decrypt` with an invalid secret |
| `HelperPatternTokenMissingException` | 500 | `fillPattern` with a token that has no value |

<!-- REFERENCES -->

[ref-doc-architecture]: ../concepts/architecture.md
[ref-doc-concept-cache]: ../concepts/cache.md
[ref-doc-concept-security]: ../concepts/security.md#cryptography-used
[ref-doc-reference-status-codes-helper]: status-codes.md#helper
[ref-doc-reference-configuration-helper]: configuration.md#helper
