# Analytics Documentation

> **⚠️ Status: Planned Feature — Not Yet Implemented**
>
> This document is a **design and reference specification** for future analytics capabilities. None of the metrics, queries, or endpoints described here have been implemented in the codebase. It serves as a blueprint for development and should be updated accordingly as features are built.

This document explains how to calculate all analytics metrics available in this project, grouped by module and ordered by business priority within each section.

All queries are written as **MongoDB aggregation pipelines** targeting the Prisma-mapped collection names. All timestamps are stored as UTC.

---

## Table of Contents

- [User Module](#user-module)
- [Auth / Session Module](#auth--session-module)
- [Verification Module](#verification-module)
- [Password Module](#password-module)
- [Two Factor Module](#two-factor-module)
- [Device Module](#device-module)
- [Notification Module](#notification-module)
- [Term Policy Module](#term-policy-module)
- [Anomaly Detection](#anomaly-detection)
- [Fraud Detection](#fraud-detection)

---

## User Module

### 1. Daily / Weekly / Monthly New User Registrations

**Business Priority:** 🔴 Critical — core growth metric for every product stakeholder report.

**Source:** `Users` collection — `signUpAt`

**Formula:**
$$\text{registrations}_{period} = \text{COUNT}(users\ WHERE\ signUpAt \in [start, end])$$

**Aggregation:**
```js
db.Users.aggregate([
  {
    $match: {
      signUpAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
      deletedAt: null,
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$signUpAt" },
        month: { $month: "$signUpAt" },
        day:   { $dayOfMonth: "$signUpAt" }, // remove for weekly/monthly
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])
```

---

### 2. User Churn Rate

**Business Priority:** 🔴 Critical — retention health indicator.

**Source:** `Users` collection — `deletedAt`

**Formula:**
$$\text{churn rate} = \frac{\text{COUNT}(deletedAt \in [start, end])}{\text{COUNT}(signUpAt \leq end)} \times 100$$

**Aggregation:**
```js
// Step 1: deleted in period
db.Users.countDocuments({
  deletedAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
})

// Step 2: total registered up to end of period
db.Users.countDocuments({
  signUpAt: { $lt: ISODate("2026-02-01") },
})

// churn rate (%) = (step1 / step2) * 100
```

---

### 3. Blocked User Trend

**Business Priority:** 🔴 Critical — direct fraud and abuse signal; required for compliance and security stakeholder reporting.

**Source:** `Users` — `status = blocked`, `updatedAt`; `ActivityLogs` — `action = userBlocked`

**Formula:**
$$\text{blocked}_{period} = \text{COUNT}(ActivityLogs\ WHERE\ action = 'userBlocked'\ AND\ createdAt \in [start, end])$$

```js
// Trend: blocks per day
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "userBlocked",
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])

// Current snapshot: total blocked users
db.Users.countDocuments({ status: "blocked" })
```

---

### 4. Sign-up Method Breakdown

**Business Priority:** 🟠 High — informs auth strategy (OAuth investment vs credential optimization).

**Source:** `Users.signUpWith` (`EnumUserSignUpWith`: `credential`, `socialGoogle`, `socialApple`)

**Formula:**
$$\text{share}_{method} = \frac{\text{COUNT}(signUpWith = method)}{\text{COUNT(all users)}} \times 100$$

**Aggregation:**
```js
db.Users.aggregate([
  { $match: { deletedAt: null } },
  { $group: { _id: "$signUpWith", count: { $sum: 1 } } },
  {
    $group: {
      _id:     null,
      total:   { $sum: "$count" },
      methods: { $push: { method: "$_id", count: "$count" } },
    },
  },
  { $unwind: "$methods" },
  {
    $project: {
      method:  "$methods.method",
      count:   "$methods.count",
      percent: { $multiply: [{ $divide: ["$methods.count", "$total"] }, 100] },
    },
  },
])
```

---

### 5. Sign-up Source Breakdown

**Business Priority:** 🟠 High — reveals which platform (web vs mobile) drives acquisition.

**Source:** `Users.signUpFrom` (`EnumUserSignUpFrom`: `system`, `admin`, `website`, `mobile`)

Same pipeline as Sign-up Method Breakdown — replace `signUpWith` with `signUpFrom`.

---

### 6. Email Verification Rate + Time-to-Verify

**Business Priority:** 🟠 High — unverified users are dormant/low-quality; affects deliverability and DAU accuracy.

**Source:** `Users` — `isVerified`, `signUpAt`, `verifiedAt`

**Formula:**
$$\text{verification rate} = \frac{\text{COUNT}(isVerified = true)}{\text{COUNT(all users)}} \times 100$$

$$\text{avg time-to-verify} = \text{AVG}(verifiedAt - signUpAt)\ \text{(in hours)}$$

**Aggregation:**
```js
db.Users.aggregate([
  { $match: { deletedAt: null } },
  {
    $group: {
      _id:         null,
      total:       { $sum: 1 },
      verified:    { $sum: { $cond: ["$isVerified", 1, 0] } },
      avgVerifyMs: {
        $avg: {
          $cond: [
            { $and: ["$isVerified", "$verifiedAt"] },
            { $subtract: ["$verifiedAt", "$signUpAt"] },
            null,
          ],
        },
      },
    },
  },
  {
    $project: {
      verificationRate: { $multiply: [{ $divide: ["$verified", "$total"] }, 100] },
      avgVerifyHours:   { $divide: ["$avgVerifyMs", 3600000] },
    },
  },
])
```

---

### 7. Mobile Number Verification Rate

**Business Priority:** 🟠 High — mobile verification is a separate funnel from email; critical for SMS-based 2FA and regional markets where phone > email.

**Source:** `UserMobiles` — `isVerified`, `verifiedAt`, `createdAt`

**Formula:**
$$\text{mobile verification rate} = \frac{\text{COUNT}(isVerified = true)}{\text{COUNT(all mobile numbers)}} \times 100$$

```js
db.UserMobiles.aggregate([
  {
    $group: {
      _id:         null,
      total:       { $sum: 1 },
      verified:    { $sum: { $cond: ["$isVerified", 1, 0] } },
      avgVerifyMs: {
        $avg: {
          $cond: [
            { $and: ["$isVerified", "$verifiedAt"] },
            { $subtract: ["$verifiedAt", "$createdAt"] },
            null,
          ],
        },
      },
    },
  },
  {
    $project: {
      verificationRate: { $multiply: [{ $divide: ["$verified", "$total"] }, 100] },
      avgVerifyHours:   { $divide: ["$avgVerifyMs", 3600000] },
      total:    1,
      verified: 1,
    },
  },
])

// Breakdown: verified mobile numbers per country
db.UserMobiles.aggregate([
  {
    $group: {
      _id:      "$countryId",
      total:    { $sum: 1 },
      verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
    },
  },
  {
    $lookup: {
      from:         "Countries",
      localField:   "_id",
      foreignField: "_id",
      as:           "country",
    },
  },
  { $unwind: "$country" },
  {
    $project: {
      country:          "$country.name",
      total:            1,
      verified:         1,
      verificationRate: { $multiply: [{ $divide: ["$verified", "$total"] }, 100] },
    },
  },
  { $sort: { total: -1 } },
])
```

---

### 8. User Status Distribution

**Business Priority:** 🟡 Medium — operational snapshot.

**Source:** `Users.status` (`EnumUserStatus`: `active`, `inactive`, `blocked`)

```js
db.Users.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
])
```

---

### 9. User Distribution by Country

**Business Priority:** 🟡 Medium — informs localization and regional support priorities.

**Source:** `Users.countryId` — join with `Countries.name`

```js
db.Users.aggregate([
  { $match: { deletedAt: null } },
  {
    $lookup: {
      from:         "Countries",
      localField:   "countryId",
      foreignField: "_id",
      as:           "country",
    },
  },
  { $unwind: "$country" },
  { $group: { _id: "$country.name", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

---

### 10. User Distribution by Role

**Business Priority:** 🟡 Medium — useful for capacity planning and permission auditing.

**Source:** `Users.roleId` — join with `Roles.name`

Same pattern as country distribution — join with `Roles` collection, group by `role.name`.

---

## Auth / Session Module

### 11. Login Frequency Over Time

**Business Priority:** 🔴 Critical — DAU/WAU/MAU proxy; most fundamental engagement metric.

**Source:** `ActivityLogs` — `action = userLoginCredential | userLoginGoogle | userLoginApple`, `createdAt`

> **Note:** `Users.lastLoginAt` only stores the last login. Use `ActivityLogs` for full historical tracking.

**Formula:**
$$\text{logins}_{day} = \text{COUNT}(ActivityLogs\ WHERE\ action \in loginActions\ AND\ createdAt \in [start, end])$$

```js
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    { $in: ["userLoginCredential", "userLoginGoogle", "userLoginApple"] },
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])
```

---

### 12. Failed Login / Lockout Rate

**Business Priority:** 🔴 Critical — security health; high lockout rate signals UX friction or active attack.

**Source:** `Users.passwordAttempt`; `ActivityLogs.action = userReachMaxPasswordAttempt`

**Formula:**
$$\text{locked users} = \text{COUNT}(passwordAttempt \geq maxAttempt)$$

```js
const MAX_ATTEMPT = 5; // from auth.config.ts

db.Users.aggregate([
  { $match: { deletedAt: null } },
  {
    $group: {
      _id:         null,
      total:       { $sum: 1 },
      locked:      { $sum: { $cond: [{ $gte: ["$passwordAttempt", MAX_ATTEMPT] }, 1, 0] } },
      attemptDist: { $push: "$passwordAttempt" },
    },
  },
  {
    $project: {
      lockoutRate: { $multiply: [{ $divide: ["$locked", "$total"] }, 100] },
      locked:      1,
      total:       1,
    },
  },
])

// Trend: lockouts reached per day
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "userReachMaxPasswordAttempt",
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
])
```

---

### 13. Session Revocation Rate

**Business Priority:** 🟠 High — security signal; high admin-revoke rate may indicate incident response activity.

**Source:** `Sessions` — `isRevoked`, `revokedAt`, `revokedById`, `userId`

- **User-initiated:** `isRevoked = true` AND `revokedById = userId`
- **Admin-initiated:** `isRevoked = true` AND `revokedById ≠ userId`

**Formula:**
$$\text{revocation rate} = \frac{\text{COUNT}(isRevoked = true\ AND\ revokedAt \in [start, end])}{\text{COUNT}(createdAt \leq end)} \times 100$$

```js
db.Sessions.aggregate([
  {
    $match: {
      revokedAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $project: {
      isAdminRevoke: { $ne: ["$userId", "$revokedById"] },
    },
  },
  {
    $group: {
      _id:          null,
      total:        { $sum: 1 },
      userRevoked:  { $sum: { $cond: ["$isAdminRevoke", 0, 1] } },
      adminRevoked: { $sum: { $cond: ["$isAdminRevoke", 1, 0] } },
    },
  },
])
```

---

### 14. Login Method Breakdown

**Business Priority:** 🟠 High — informs which auth providers are actively used vs maintained unnecessarily.

**Source:** `ActivityLogs` — `action = userLoginCredential | userLoginGoogle | userLoginApple`

```js
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    { $in: ["userLoginCredential", "userLoginGoogle", "userLoginApple"] },
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  { $group: { _id: "$action", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

---

### 15. Login Source Breakdown

**Business Priority:** 🟠 High — website vs mobile split informs platform investment.

**Source:** `Users.lastLoginFrom` (`EnumUserLoginFrom`: `website`, `mobile`)

```js
db.Users.aggregate([
  { $match: { deletedAt: null, lastLoginFrom: { $ne: null } } },
  { $group: { _id: "$lastLoginFrom", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

> For historical breakdown, use `ActivityLogs.metadata` if login source is logged there.

---

### 16. Concurrent Sessions Distribution

**Business Priority:** 🟡 Medium — capacity planning + anomaly baseline for session proliferation detection.

**Source:** `Sessions` — non-revoked, non-expired

**Formula:**
$$\text{sessions per user} = \text{COUNT}(Sessions\ WHERE\ isRevoked = false\ AND\ expiredAt > now)\ \text{GROUP BY userId}$$

```js
const now = new Date();

db.Sessions.aggregate([
  {
    $match: {
      isRevoked: false,
      expiredAt: { $gt: now },
    },
  },
  { $group: { _id: "$userId", sessionCount: { $sum: 1 } } },
  {
    $group: {
      _id:  null,
      avg:  { $avg: "$sessionCount" },
      max:  { $max: "$sessionCount" },
      dist: { $push: "$sessionCount" },
    },
  },
])
```

For percentiles (p50, p90) — use `$percentile` operator (MongoDB 7.0+):
```js
{ $group: {
    _id: null,
    p50: { $percentile: { input: "$sessionCount", p: [0.5], method: "approximate" } },
    p90: { $percentile: { input: "$sessionCount", p: [0.9], method: "approximate" } },
}}
```

---

### 17. Sessions by Geography

**Business Priority:** 🟡 Medium — regional access patterns; useful for CDN and compliance decisions.

**Source:** `Sessions.geoLocation` (`GeoLocation` type: `country`, `region`, `city`, `latitude`, `longitude`)

```js
db.Sessions.aggregate([
  { $match: { "geoLocation": { $ne: null } } },
  { $group: { _id: "$geoLocation.country", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 20 },
])
```

---

### 18. Sessions by User Agent

**Business Priority:** 🟡 Medium — browser/OS/device type breakdown for frontend support decisions.

**Source:** `Sessions.userAgent` (`UserAgent` type: `browser.name`, `os.name`, `device.type`)

```js
// Browser breakdown
db.Sessions.aggregate([
  { $match: { "userAgent.browser.name": { $ne: null } } },
  { $group: { _id: "$userAgent.browser.name", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])

// OS breakdown
db.Sessions.aggregate([
  { $match: { "userAgent.os.name": { $ne: null } } },
  { $group: { _id: "$userAgent.os.name", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

---

## Verification Module

### 19. Verification Funnel (Email & Mobile)

**Business Priority:** 🔴 Critical — expired/unused tokens directly indicate UX friction or deliverability failures. High drop-off here = lost activations.

**Source:** `Verifications` — `type`, `isUsed`, `expiredAt`, `verifiedAt`, `createdAt`

**Formula:**
$$\text{conversion rate}_{type} = \frac{\text{COUNT}(isUsed = true\ AND\ type = X)}{\text{COUNT}(type = X)} \times 100$$

$$\text{expiry rate}_{type} = \frac{\text{COUNT}(isUsed = false\ AND\ expiredAt < now\ AND\ type = X)}{\text{COUNT}(type = X)} \times 100$$

```js
const now = new Date();

// Funnel breakdown per type
db.Verifications.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id:     "$type",
      total:   { $sum: 1 },
      used:    { $sum: { $cond: ["$isUsed", 1, 0] } },
      expired: {
        $sum: {
          $cond: [
            { $and: [{ $eq: ["$isUsed", false] }, { $lt: ["$expiredAt", now] }] },
            1, 0,
          ],
        },
      },
      avgVerifyMs: {
        $avg: {
          $cond: [
            "$isUsed",
            { $subtract: ["$verifiedAt", "$createdAt"] },
            null,
          ],
        },
      },
    },
  },
  {
    $project: {
      type:           "$_id",
      total:          1,
      used:           1,
      expired:        1,
      conversionRate: { $multiply: [{ $divide: ["$used", "$total"] }, 100] },
      expiryRate:     { $multiply: [{ $divide: ["$expired", "$total"] }, 100] },
      avgVerifyMinutes: { $divide: ["$avgVerifyMs", 60000] },
    },
  },
])

// Users who requested verification multiple times without completing
// (indicates re-send loop — UX or deliverability problem)
db.Verifications.aggregate([
  {
    $match: {
      isUsed:    false,
      expiredAt: { $lt: now },
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  { $group: { _id: { userId: "$userId", type: "$type" }, count: { $sum: 1 } } },
  { $match: { count: { $gte: 2 } } }, // requested > once without success
  {
    $group: {
      _id:          "$_id.type",
      affectedUsers:{ $sum: 1 },
      avgResends:   { $avg: "$count" },
    },
  },
])
```

---

## Password Module

### 20. Password Expiry Compliance

**Business Priority:** 🔴 Critical — expired passwords that are not rotated are a security posture risk; required for SOC2/ISO27001 compliance reporting.

**Source:** `Users` — `passwordExpired`, `passwordCreated`, `lastLoginAt`

**Formula:**
$$\text{expired users} = \text{COUNT}(passwordExpired \leq now\ AND\ deletedAt = null\ AND\ status = 'active')$$

```js
const now = new Date();

db.Users.aggregate([
  {
    $match: {
      deletedAt: null,
      status:    "active",
      password:  { $ne: null }, // credential users only
    },
  },
  {
    $group: {
      _id:          null,
      total:        { $sum: 1 },
      expired:      {
        $sum: {
          $cond: [
            { $and: [
              { $ne: ["$passwordExpired", null] },
              { $lte: ["$passwordExpired", now] },
            ]},
            1, 0,
          ],
        },
      },
      neverSet: { $sum: { $cond: [{ $eq: ["$passwordCreated", null] }, 1, 0] } },
    },
  },
  {
    $project: {
      total:          1,
      expired:        1,
      neverSet:       1,
      expiryRate:     { $multiply: [{ $divide: ["$expired", "$total"] }, 100] },
    },
  },
])

// Breakdown by how long ago password expired (aging buckets)
db.Users.aggregate([
  {
    $match: {
      deletedAt:       null,
      status:          "active",
      passwordExpired: { $ne: null, $lte: now },
    },
  },
  {
    $project: {
      daysExpired: {
        $divide: [{ $subtract: [now, "$passwordExpired"] }, 86400000],
      },
    },
  },
  {
    $bucket: {
      groupBy:    "$daysExpired",
      boundaries: [0, 7, 30, 90, 180, 365],
      default:    "365+",
      output:     { count: { $sum: 1 } },
    },
  },
])
```

---

### 21. Password Change Frequency

**Business Priority:** 🟠 High — distinguishes organic changes from admin-forced or forgot-password flows; signals security hygiene.

**Source:** `PasswordHistories` — `type` (`EnumPasswordHistoryType`), `createdAt`

Types: `signUp`, `forgot`, `admin`, `profile`

```js
db.PasswordHistories.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        type:  "$type",
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])
```

---

### 22. Forgot Password → Reset Conversion Rate

**Business Priority:** 🟠 High — low conversion = broken email delivery or bad UX; directly impacts account recovery success.

**Source:** `ForgotPasswords` — `isUsed`, `resetAt`, `createdAt`

**Formula:**
$$\text{conversion rate} = \frac{\text{COUNT}(isUsed = true\ AND\ resetAt \in [start, end])}{\text{COUNT}(createdAt \in [start, end])} \times 100$$

```js
db.ForgotPasswords.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id:        null,
      total:      { $sum: 1 },
      converted:  { $sum: { $cond: ["$isUsed", 1, 0] } },
      avgResetMs: {
        $avg: {
          $cond: [
            "$isUsed",
            { $subtract: ["$resetAt", "$createdAt"] },
            null,
          ],
        },
      },
    },
  },
  {
    $project: {
      conversionRate:  { $multiply: [{ $divide: ["$converted", "$total"] }, 100] },
      avgResetMinutes: { $divide: ["$avgResetMs", 60000] },
      total:     1,
      converted: 1,
    },
  },
])
```

---

### 23. Admin-Forced Password Reset Rate

**Business Priority:** 🟡 Medium — high rate may indicate systematic account remediation or security incident response.

**Source:** `PasswordHistories.type = admin`

```js
db.PasswordHistories.aggregate([
  {
    $match: {
      type:      "admin",
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
])
```

---

## Two Factor Module

### 24. 2FA Adoption Rate

**Business Priority:** 🔴 Critical — security posture KPI; commonly tracked in SOC2 and enterprise customer requirements.

**Source:** `TwoFactors.enabled`

**Formula:**
$$\text{2FA adoption} = \frac{\text{COUNT}(enabled = true)}{\text{COUNT(active users)}} \times 100$$

```js
db.TwoFactors.aggregate([
  {
    $group: {
      _id:     null,
      total:   { $sum: 1 },
      enabled: { $sum: { $cond: ["$enabled", 1, 0] } },
      requiredSetup: { $sum: { $cond: ["$requiredSetup", 1, 0] } },
    },
  },
  {
    $project: {
      adoptionRate:       { $multiply: [{ $divide: ["$enabled", "$total"] }, 100] },
      requiredSetupCount: "$requiredSetup",
      total:   1,
      enabled: 1,
    },
  },
])
```

---

### 25. 2FA Reset by Admin Rate

**Business Priority:** 🟠 High — high reset volume signals either support burden or account takeover remediation.

**Source:** `ActivityLogs.action = adminUserResetTwoFactor`

```js
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "adminUserResetTwoFactor",
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
])
```

---

## Device Module

### 26. Device Registration Trend Over Time

**Business Priority:** 🔴 Critical — new device registrations correlate with new user activations and platform adoption growth.

**Source:** `Devices` — `createdAt`, `platform`

```js
db.Devices.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:     { $year: "$createdAt" },
        month:    { $month: "$createdAt" },
        day:      { $dayOfMonth: "$createdAt" },
        platform: "$platform",
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])

// Total new devices per period (all platforms combined)
db.Devices.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
])
```

---

### 27. Device Platform Distribution

**Business Priority:** 🟠 High — iOS vs Android vs web split drives mobile engineering resource allocation.

**Source:** `Devices.platform` (`EnumDevicePlatform`: `ios`, `android`, `web`)

```js
db.Devices.aggregate([
  { $group: { _id: "$platform", count: { $sum: 1 } } },
  {
    $group: {
      _id:       null,
      total:     { $sum: "$count" },
      platforms: { $push: { platform: "$_id", count: "$count" } },
    },
  },
  { $unwind: "$platforms" },
  {
    $project: {
      platform: "$platforms.platform",
      count:    "$platforms.count",
      percent:  { $multiply: [{ $divide: ["$platforms.count", "$total"] }, 100] },
    },
  },
])
```

---

### 28. Notification Provider Distribution

**Business Priority:** 🟠 High — FCM vs APNS split validates Android/iOS ratio from the push infrastructure perspective; divergence from platform split signals stale/orphan tokens.

**Source:** `Devices.notificationProvider` (`EnumDeviceNotificationProvider`: `fcm`, `apns`)

```js
db.Devices.aggregate([
  {
    $match: {
      notificationProvider: { $ne: null },
    },
  },
  { $group: { _id: "$notificationProvider", count: { $sum: 1 } } },
  {
    $group: {
      _id:       null,
      total:     { $sum: "$count" },
      providers: { $push: { provider: "$_id", count: "$count" } },
    },
  },
  { $unwind: "$providers" },
  {
    $project: {
      provider: "$providers.provider",
      count:    "$providers.count",
      percent:  { $multiply: [{ $divide: ["$providers.count", "$total"] }, 100] },
    },
  },
])

// Cross-check: provider vs platform (should align — fcm=android, apns=ios)
db.Devices.aggregate([
  { $match: { notificationProvider: { $ne: null } } },
  {
    $group: {
      _id:   { platform: "$platform", provider: "$notificationProvider" },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
])
```

---

### 29. Push Token Registration Rate

**Business Priority:** 🟠 High — devices without tokens cannot receive push notifications; affects reachability KPIs.

**Source:** `Devices` — `notificationToken` non-null

**Formula:**
$$\text{token rate} = \frac{\text{COUNT}(notificationToken \neq null)}{\text{COUNT(all devices)}} \times 100$$

```js
db.Devices.aggregate([
  {
    $group: {
      _id:       null,
      total:     { $sum: 1 },
      withToken: { $sum: { $cond: [{ $ne: ["$notificationToken", null] }, 1, 0] } },
    },
  },
  {
    $project: {
      tokenRate: { $multiply: [{ $divide: ["$withToken", "$total"] }, 100] },
      total:     1,
      withToken: 1,
    },
  },
])
```

---

### 30. New Device Login Events

**Business Priority:** 🟠 High — each event is a potential security notification trigger; volume informs notification system load.

**Source:** `ActivityLogs.action = userDeviceRefresh`, `createdAt`

```js
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "userDeviceRefresh",
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
])
```

---

### 31. Session-to-Device Ratio Anomaly

**Business Priority:** 🟠 High — device-user pairs generating abnormally many sessions may indicate token refresh abuse or compromised devices.

**Source:** `Sessions` (non-revoked, non-expired) grouped by `DeviceOwnership`

```js
const now = new Date();

// Active sessions per device-user pair (DeviceOwnership)
db.Sessions.aggregate([
  {
    $match: {
      isRevoked: false,
      expiredAt: { $gt: now },
    },
  },
  { $group: { _id: "$deviceOwnershipId", sessionCount: { $sum: 1 } } },
  {
    $group: {
      _id:    null,
      avg:    { $avg: "$sessionCount" },
      stdDev: { $stdDevPop: "$sessionCount" },
      all:    { $push: { deviceOwnershipId: "$_id", sessionCount: "$sessionCount" } },
    },
  },
  { $unwind: "$all" },
  {
    $project: {
      deviceOwnershipId: "$all.deviceOwnershipId",
      sessionCount:     "$all.sessionCount",
      zScore: {
        $divide: [
          { $subtract: ["$all.sessionCount", "$avg"] },
          "$stdDev",
        ],
      },
    },
  },
  // Flag devices with z-score > 3 (more than 3 standard deviations above mean)
  { $match: { zScore: { $gt: 3 } } },
  { $sort: { sessionCount: -1 } },
])
```

---

### 32. Devices per User Distribution

**Business Priority:** 🟡 Medium — baseline for anomaly detection (A4) and capacity estimation.

**Source:** `Devices` — grouped by `userId`

```js
db.Devices.aggregate([
  { $group: { _id: "$userId", deviceCount: { $sum: 1 } } },
  {
    $group: {
      _id: null,
      avg: { $avg: "$deviceCount" },
      max: { $max: "$deviceCount" },
      p50: { $percentile: { input: "$deviceCount", p: [0.5], method: "approximate" } },
      p90: { $percentile: { input: "$deviceCount", p: [0.9], method: "approximate" } },
    },
  },
])
```

---

### 33. Device Inactivity

**Business Priority:** 🟡 Medium — stale devices waste push quota and inflate token registration rate.

**Source:** `Devices.lastActiveAt`

**Formula:**
$$\text{inactive devices} = \text{COUNT}(lastActiveAt < now - 30\ days)$$

```js
const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

db.Devices.aggregate([
  {
    $group: {
      _id:      null,
      total:    { $sum: 1 },
      inactive: { $sum: { $cond: [{ $lt: ["$lastActiveAt", threshold] }, 1, 0] } },
    },
  },
  {
    $project: {
      inactiveRate: { $multiply: [{ $divide: ["$inactive", "$total"] }, 100] },
      total:    1,
      inactive: 1,
    },
  },
])
```

---

## Notification Module

### 34. Notification Delivery Success Rate per Channel

**Business Priority:** 🔴 Critical — delivery failures directly mean users miss important alerts; affects trust and retention.

**Source:** `NotificationDeliveries` — `sentAt`, `channel`, `processedAt`

**Formula:**
$$\text{success rate}_{channel} = \frac{\text{COUNT}(sentAt \neq null\ AND\ channel = X)}{\text{COUNT}(channel = X\ AND\ processedAt \neq null)} \times 100$$

```js
db.NotificationDeliveries.aggregate([
  { $match: { processedAt: { $ne: null } } },
  {
    $group: {
      _id:       "$channel",
      processed: { $sum: 1 },
      sent:      { $sum: { $cond: [{ $ne: ["$sentAt", null] }, 1, 0] } },
    },
  },
  {
    $project: {
      channel:     "$_id",
      successRate: { $multiply: [{ $divide: ["$sent", "$processed"] }, 100] },
      processed:   1,
      sent:        1,
    },
  },
])
```

---

### 35. Delivery Processing Latency (Queue Wait Time)

**Business Priority:** 🔴 Critical — long queue wait means notifications arrive late; for security alerts this can be catastrophic.

**Source:** `NotificationDeliveries` — `createdAt` → `processedAt`

**Formula:**
$$\text{queue latency} = \text{AVG}(processedAt - createdAt)\ \text{(in seconds)}$$

```js
db.NotificationDeliveries.aggregate([
  {
    $match: {
      processedAt: { $ne: null },
      createdAt:   { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $project: {
      channel:      1,
      processingMs: { $subtract: ["$processedAt", "$createdAt"] },
    },
  },
  {
    $group: {
      _id:       "$channel",
      avgMs:     { $avg: "$processingMs" },
      p50Ms: {
        $percentile: {
          input:  "$processingMs",
          p:      [0.5],
          method: "approximate",
        },
      },
      p95Ms: {
        $percentile: {
          input:  "$processingMs",
          p:      [0.95],
          method: "approximate",
        },
      },
      maxMs: { $max: "$processingMs" },
    },
  },
  {
    $project: {
      channel:          "$_id",
      avgSeconds:       { $divide: ["$avgMs", 1000] },
      p50Seconds:       { $divide: [{ $arrayElemAt: ["$p50Ms", 0] }, 1000] },
      p95Seconds:       { $divide: [{ $arrayElemAt: ["$p95Ms", 0] }, 1000] },
      maxSeconds:       { $divide: ["$maxMs", 1000] },
    },
  },
])
```

---

### 36. Delivery Send Latency (Provider Round-Trip)

**Business Priority:** 🔴 Critical — measures actual time to send to FCM/SES/APNS after job is picked up; isolates provider-side slowness.

**Source:** `NotificationDeliveries` — `processedAt` → `sentAt`

**Formula:**
$$\text{send latency} = \text{AVG}(sentAt - processedAt)\ \text{(in milliseconds)}$$

```js
db.NotificationDeliveries.aggregate([
  {
    $match: {
      processedAt: { $ne: null },
      sentAt:      { $ne: null },
      createdAt:   { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $project: {
      channel: 1,
      sendMs:  { $subtract: ["$sentAt", "$processedAt"] },
    },
  },
  {
    $group: {
      _id:   "$channel",
      avgMs: { $avg: "$sendMs" },
      p50Ms: {
        $percentile: {
          input:  "$sendMs",
          p:      [0.5],
          method: "approximate",
        },
      },
      p95Ms: {
        $percentile: {
          input:  "$sendMs",
          p:      [0.95],
          method: "approximate",
        },
      },
      maxMs: { $max: "$sendMs" },
    },
  },
  {
    $project: {
      channel:    "$_id",
      avgMs:      1,
      p50Ms:      { $arrayElemAt: ["$p50Ms", 0] },
      p95Ms:      { $arrayElemAt: ["$p95Ms", 0] },
      maxMs:      1,
    },
  },
])
```

---

### 37. Notification Read Rate per Type

**Business Priority:** 🟠 High — measures content relevance and user engagement with notification types.

**Source:** `Notifications` — `isRead`, `type`

**Formula:**
$$\text{read rate}_{type} = \frac{\text{COUNT}(isRead = true\ AND\ type = X)}{\text{COUNT}(type = X)} \times 100$$

```js
db.Notifications.aggregate([
  {
    $group: {
      _id:   "$type",
      total: { $sum: 1 },
      read:  { $sum: { $cond: ["$isRead", 1, 0] } },
    },
  },
  {
    $project: {
      type:     "$_id",
      readRate: { $multiply: [{ $divide: ["$read", "$total"] }, 100] },
      total:    1,
      read:     1,
    },
  },
])
```

---

### 38. Notification Volume per Channel

**Business Priority:** 🟠 High — per-channel volume determines infrastructure cost (FCM calls, SES emails, in-app storage).

**Source:** `NotificationDeliveries.channel`

```js
db.NotificationDeliveries.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  { $group: { _id: "$channel", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

---

### 39. Notification Priority Distribution

**Business Priority:** 🟠 High — disproportionate `critical` or `high` volume may indicate misconfigured triggers that erode user trust.

**Source:** `Notifications.priority` (`EnumNotificationPriority`: `low`, `normal`, `high`, `critical`)

```js
db.Notifications.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  { $group: { _id: "$priority", count: { $sum: 1 } } },
  {
    $group: {
      _id:        null,
      total:      { $sum: "$count" },
      priorities: { $push: { priority: "$_id", count: "$count" } },
    },
  },
  { $unwind: "$priorities" },
  {
    $project: {
      priority: "$priorities.priority",
      count:    "$priorities.count",
      percent:  { $multiply: [{ $divide: ["$priorities.count", "$total"] }, 100] },
    },
  },
  { $sort: { count: -1 } },
])
```

---

### 40. Push Failure Token Rate

**Business Priority:** 🟠 High — high failure token rate = stale/revoked device tokens; inflates send costs and reduces actual reach.

**Source:** `NotificationDeliveries` — `failureTokens`, `channel = push`

**Formula:**
$$\text{failure token rate} = \frac{\text{COUNT(deliveries with failureTokens > 0)}}{\text{COUNT(total push deliveries processed)}} \times 100$$

```js
db.NotificationDeliveries.aggregate([
  {
    $match: {
      channel:     "push",
      processedAt: { $ne: null },
      createdAt:   { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  {
    $group: {
      _id:               null,
      totalDeliveries:   { $sum: 1 },
      totalFailedTokens: { $sum: { $size: "$failureTokens" } },
      deliveriesWithFailures: {
        $sum: { $cond: [{ $gt: [{ $size: "$failureTokens" }, 0] }, 1, 0] },
      },
    },
  },
  {
    $project: {
      failureDeliveryRate: {
        $multiply: [{ $divide: ["$deliveriesWithFailures", "$totalDeliveries"] }, 100],
      },
      totalFailedTokens: 1,
      totalDeliveries:   1,
    },
  },
])
```

---

### 41. Notification Opt-out Rate per Channel/Type

**Business Priority:** 🟠 High — high opt-out rate for a specific type/channel signals notification fatigue or irrelevance.

**Source:** `NotificationUserSettings` — `isActive`

**Formula:**
$$\text{opt-out rate}_{channel, type} = \frac{\text{COUNT}(isActive = false)}{\text{COUNT(all settings for channel+type)}} \times 100$$

```js
db.NotificationUserSettings.aggregate([
  {
    $group: {
      _id:      { channel: "$channel", type: "$type" },
      total:    { $sum: 1 },
      optedOut: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
    },
  },
  {
    $project: {
      channel:    "$_id.channel",
      type:       "$_id.type",
      optOutRate: { $multiply: [{ $divide: ["$optedOut", "$total"] }, 100] },
      total:      1,
      optedOut:   1,
    },
  },
])
```

---

### 42. User Notification Setting Adoption Rate

**Business Priority:** 🟡 Medium — users who never touch settings are on defaults; understanding this split informs whether to change defaults or improve settings discoverability.

**Source:** `NotificationUserSettings` — `updatedAt`, `createdAt`, `userId`; cross-referenced with active `Users`

> A user is considered to have "customized" their settings if any of their `NotificationUserSetting` records have `updatedAt > createdAt` (i.e., they actually changed a value after initial creation).

```js
// Step 1: users who have modified at least one notification setting
db.NotificationUserSettings.aggregate([
  {
    $match: {
      $expr: { $gt: ["$updatedAt", "$createdAt"] },
    },
  },
  {
    $group: {
      _id: "$userId",
    },
  },
  { $count: "usersWhoCustomized" },
])

// Step 2: total active users
db.Users.countDocuments({ deletedAt: null, status: "active" })

// adoption rate (%) = (usersWhoCustomized / totalActiveUsers) * 100

// Breakdown: which channel+type combinations are most commonly changed
db.NotificationUserSettings.aggregate([
  {
    $match: {
      $expr: { $gt: ["$updatedAt", "$createdAt"] },
    },
  },
  {
    $group: {
      _id:   { channel: "$channel", type: "$type" },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
])
```

---

### 43. Time-to-Read Notification

**Business Priority:** 🟡 Medium — engagement quality metric; very long time-to-read may indicate push is not reaching users.

**Source:** `Notifications` — `readAt`, `createdAt`

**Formula:**
$$\text{avg time-to-read} = \text{AVG}(readAt - createdAt)\ \text{(in minutes)}$$

```js
db.Notifications.aggregate([
  { $match: { isRead: true, readAt: { $ne: null } } },
  {
    $group: {
      _id:          "$type",
      avgReadMs:    { $avg: { $subtract: ["$readAt", "$createdAt"] } },
      medianReadMs: {
        $percentile: {
          input:  { $subtract: ["$readAt", "$createdAt"] },
          p:      [0.5],
          method: "approximate",
        },
      },
    },
  },
  {
    $project: {
      type:           "$_id",
      avgReadMinutes: { $divide: ["$avgReadMs", 60000] },
      p50ReadMinutes: { $divide: [{ $arrayElemAt: ["$medianReadMs", 0] }, 60000] },
    },
  },
])
```

---

### 44. Notification Volume per Type

**Business Priority:** 🟡 Medium — volume distribution across types identifies which product areas generate the most noise.

**Source:** `Notifications.type`

```js
db.Notifications.aggregate([
  {
    $match: {
      createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") },
    },
  },
  { $group: { _id: "$type", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])
```

---

## Term Policy Module

### 45. Term Policy Acceptance Rate

**Business Priority:** 🔴 Critical — legal compliance requirement; unaccepted policies expose the company to regulatory risk.

**Source:** `TermPolicyUserAcceptances` — join with `TermPolicies`

**Formula:**
$$\text{acceptance rate} = \frac{\text{COUNT}(acceptances\ for\ termPolicyId)}{\text{COUNT(active users at publishedAt)}} \times 100$$

```js
// Step 1: Get total acceptances per policy
db.TermPolicyUserAcceptances.aggregate([
  { $group: { _id: "$termPolicyId", accepted: { $sum: 1 } } },
  {
    $lookup: {
      from:         "TermPolicies",
      localField:   "_id",
      foreignField: "_id",
      as:           "policy",
    },
  },
  { $unwind: "$policy" },
  {
    $project: {
      type:        "$policy.type",
      version:     "$policy.version",
      publishedAt: "$policy.publishedAt",
      accepted:    1,
    },
  },
])

// Step 2: total active users at time of publish
db.Users.countDocuments({
  signUpAt: { $lte: ISODate("2026-01-15") }, // publishedAt
  status:   "active",
  $or: [
    { deletedAt: null },
    { deletedAt: { $gt: ISODate("2026-01-15") } },
  ],
})
```

---

### 46. Time-to-Accept Term Policy

**Business Priority:** 🟡 Medium — slow acceptance curves may indicate users ignoring policy prompts, a UX or legal concern.

**Source:** `TermPolicyUserAcceptances.acceptedAt` — compared with `TermPolicies.publishedAt`

**Formula:**
$$\text{avg time-to-accept} = \text{AVG}(acceptedAt - publishedAt)\ \text{(in hours)}$$

```js
db.TermPolicyUserAcceptances.aggregate([
  {
    $lookup: {
      from:         "TermPolicies",
      localField:   "termPolicyId",
      foreignField: "_id",
      as:           "policy",
    },
  },
  { $unwind: "$policy" },
  {
    $project: {
      diffMs: { $subtract: ["$acceptedAt", "$policy.publishedAt"] },
      type:   "$policy.type",
    },
  },
  {
    $group: {
      _id:   "$type",
      avgMs: { $avg: "$diffMs" },
      p50Ms: {
        $percentile: {
          input:  "$diffMs",
          p:      [0.5],
          method: "approximate",
        },
      },
    },
  },
  {
    $project: {
      type:           "$_id",
      avgAcceptHours: { $divide: ["$avgMs", 3600000] },
      p50AcceptHours: { $divide: [{ $arrayElemAt: ["$p50Ms", 0] }, 3600000] },
    },
  },
])
```

---

## Anomaly Detection

Anomaly detection identifies **abnormal patterns** from users or the system that potentially indicate security issues — not explicitly fraud, but early signals requiring investigation.

---

### A1. Impossible Travel

A user logs in from two geographically distant locations within a time window physically impossible to traverse.

**Source:** `Sessions` — `geoLocation`, `createdAt`, `userId`

**Logic:**
- Fetch two consecutive sessions for the same user
- Calculate geographical distance between `geoLocation` values (Haversine formula)
- If distance > threshold AND time difference < threshold → anomaly

**Formula (Haversine — calculated in application layer):**
$$d = 2r \cdot \arcsin\!\left(\sqrt{\sin^2\!\frac{\Delta\phi}{2} + \cos\phi_1\cos\phi_2\sin^2\!\frac{\Delta\lambda}{2}}\right)$$

Where $r = 6371$ km, $\phi$ = latitude, $\lambda$ = longitude.

```js
db.Sessions.aggregate([
  {
    $match: {
      isRevoked:   false,
      geoLocation: { $ne: null },
      createdAt:   { $gte: ISODate("2026-01-01") },
    },
  },
  { $sort: { userId: 1, createdAt: 1 } },
  {
    $group: {
      _id:      "$userId",
      sessions: {
        $push: {
          createdAt: "$createdAt",
          lat:       "$geoLocation.latitude",
          lng:       "$geoLocation.longitude",
          country:   "$geoLocation.country",
          ipAddress: "$ipAddress",
        },
      },
    },
  },
])
// In application layer: for each user, compare session[i] and session[i-1]
// Calculate Haversine distance and time delta
// Flag if: distance > 500 km AND delta < 1 hour
```

**Recommended thresholds:**
| Parameter | Value |
|-----------|-------|
| Minimum distance | 500 km |
| Maximum time difference | 1 hour |
| Implied speed | > 500 km/h |

---

### A2. Login Spike from a Single IP

A single IP attempts login across many different accounts in a short period — indicates credential stuffing or scanning.

**Source:** `ActivityLogs` — `action`, `ipAddress`, `createdAt`

```js
const WINDOW_MINUTES    = 10;
const THRESHOLD_ACCOUNTS = 5;

db.ActivityLogs.aggregate([
  {
    $match: {
      action:    { $in: ["userLoginCredential", "userLoginGoogle", "userLoginApple"] },
      createdAt: { $gte: new Date(Date.now() - WINDOW_MINUTES * 60 * 1000) },
    },
  },
  {
    $group: {
      _id:      "$ipAddress",
      userIds:  { $addToSet: "$userId" },
      attempts: { $sum: 1 },
    },
  },
  {
    $project: {
      ipAddress:   "$_id",
      uniqueUsers: { $size: "$userIds" },
      attempts:    1,
    },
  },
  { $match: { uniqueUsers: { $gte: THRESHOLD_ACCOUNTS } } },
  { $sort: { uniqueUsers: -1 } },
])
```

---

### A3. Unusual Failed Login Spike Per User

Spike in `passwordAttempt` across many accounts simultaneously — different from a single account forgetting their password.

**Source:** `Users.passwordAttempt`

```js
const MAX_ATTEMPT = 5;

db.Users.aggregate([
  { $match: { deletedAt: null, passwordAttempt: { $gt: 0 } } },
  {
    $bucket: {
      groupBy:    "$passwordAttempt",
      boundaries: [1, 2, 3, 4, 5, 10],
      default:    "10+",
      output: { count: { $sum: 1 } },
    },
  },
])

// Flag users approaching lockout
db.Users.find({
  deletedAt:       null,
  passwordAttempt: { $gte: MAX_ATTEMPT - 1 },
}, { email: 1, passwordAttempt: 1, lastIPAddress: 1, lastLoginAt: 1 })
```

---

### A4. Sudden Device Proliferation per User

A user suddenly has far more devices than average — could indicate a compromised account being sold or device farming.

**Source:** `Devices` — grouped by `userId`

```js
db.Devices.aggregate([
  { $group: { _id: "$userId", deviceCount: { $sum: 1 } } },
  {
    $group: {
      _id:    null,
      avg:    { $avg: "$deviceCount" },
      stdDev: { $stdDevPop: "$deviceCount" },
      all:    { $push: { userId: "$_id", deviceCount: "$deviceCount" } },
    },
  },
  { $unwind: "$all" },
  {
    $project: {
      userId:      "$all.userId",
      deviceCount: "$all.deviceCount",
      zScore: {
        $divide: [
          { $subtract: ["$all.deviceCount", "$avg"] },
          "$stdDev",
        ],
      },
    },
  },
  { $match: { zScore: { $gt: 3 } } },
  { $sort: { deviceCount: -1 } },
])
```

---

### A5. Login Time Anomaly

A user who historically logs in during business hours suddenly logs in late at night — potential account takeover.

**Source:** `ActivityLogs` — `action = userLoginCredential | userLoginGoogle | userLoginApple`, `createdAt`, `userId`

```js
db.ActivityLogs.aggregate([
  { $match: { action: { $in: ["userLoginCredential", "userLoginGoogle", "userLoginApple"] } } },
  {
    $group: {
      _id: {
        userId: "$userId",
        hour:   { $hour: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  {
    $group: {
      _id:   "$_id.userId",
      hours: { $push: { hour: "$_id.hour", count: "$count" } },
    },
  },
])
// In application layer: calculate hour distribution per user,
// flag if the most recent login occurred at an hour with
// historical frequency < 5% of total user activity.
```

---

## Fraud Detection

Fraud detection identifies **explicitly suspicious or harmful actions** requiring immediate action (block, alert, or manual review).

---

### F1. Credential Stuffing Detection

Many different accounts hit `loginFailed` from the same IP in a short window.

**Source:** `ActivityLogs` — `action = userLoginCredential` (failed implied by `userReachMaxPasswordAttempt` or custom failed action), `ipAddress`, `userId`, `createdAt`

```js
const WINDOW_MS    = 5 * 60 * 1000; // 5 minutes
const MIN_ACCOUNTS = 10;

db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "userReachMaxPasswordAttempt",
      createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
    },
  },
  {
    $group: {
      _id:         "$ipAddress",
      uniqueUsers: { $addToSet: "$userId" },
      userAgents:  { $addToSet: "$userAgent.ua" },
      failCount:   { $sum: 1 },
    },
  },
  {
    $project: {
      ip:               "$_id",
      uniqueUserCount:  { $size: "$uniqueUsers" },
      uniqueUserAgents: { $size: "$userAgents" },
      failCount:        1,
    },
  },
  { $match: { uniqueUserCount: { $gte: MIN_ACCOUNTS } } },
  { $sort: { uniqueUserCount: -1 } },
])
// uniqueUserAgents = 1 → likely single bot
// uniqueUserAgents is high but same IP → distributed stuffing
```

---

### F2. Account Takeover Indicators (ATO)

Combination of sensitive actions in a short window — classic compromised account pattern.

| Signal | Source |
|--------|--------|
| Password changed | `PasswordHistories.type = profile` |
| GeoLocation changed drastically | `Sessions.geoLocation` different country from previous |
| New device added | `Devices.createdAt` within 1 hour of password change |
| 2FA disabled or reset | `ActivityLogs.action = userDisableTwoFactor` or `adminUserResetTwoFactor` |
| New push token registered | `Devices.notificationToken` updated |

```js
// Password change followed by new device within 1 hour
const passwordChanges = db.PasswordHistories.aggregate([
  {
    $match: {
      type:      "profile",
      createdAt: { $gte: ISODate("2026-01-01") },
    },
  },
  { $project: { userId: 1, changedAt: "$createdAt" } },
]).toArray();

passwordChanges.forEach(({ userId, changedAt }) => {
  const newDevice = db.Devices.findOne({
    userId,
    createdAt: {
      $gte: changedAt,
      $lte: new Date(changedAt.getTime() + 3600000),
    },
  });
  if (newDevice) {
    // Flag as ATO candidate
  }
});
```

---

### F3. Mass Account Registration Abuse

Mass registration from the same IP or email domain pattern — bot sign-up for spam, token farming, or promotion abuse.

**Source:** `Users` — `signUpAt`, `lastIPAddress`, `email`

```js
const WINDOW_MINUTES     = 30;
const THRESHOLD_ACCOUNTS = 5;

// IP-based
db.Users.aggregate([
  {
    $match: {
      signUpAt:  { $gte: new Date(Date.now() - WINDOW_MINUTES * 60 * 1000) },
      deletedAt: null,
    },
  },
  { $group: { _id: "$lastIPAddress", count: { $sum: 1 } } },
  { $match: { count: { $gte: THRESHOLD_ACCOUNTS } } },
  { $sort: { count: -1 } },
])

// Domain pattern-based
db.Users.aggregate([
  {
    $match: {
      signUpAt:  { $gte: ISODate("2026-01-01") },
      deletedAt: null,
    },
  },
  {
    $project: {
      domain: { $arrayElemAt: [{ $split: ["$email", "@"] }, 1] },
    },
  },
  { $group: { _id: "$domain", count: { $sum: 1 } } },
  { $match: { count: { $gte: 10 } } },
  { $sort: { count: -1 } },
])
```

---

### F4. Password Reset Enumeration

Bot sends forgot password requests to many emails to identify which accounts exist — account enumeration attack.

**Source:** `ActivityLogs` — `action = userForgotPassword`, `ipAddress`, `userId`

```js
const WINDOW_MS    = 10 * 60 * 1000; // 10 minutes
const MIN_REQUESTS = 5;

db.ActivityLogs.aggregate([
  {
    $match: {
      action:    "userForgotPassword",
      createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
    },
  },
  {
    $group: {
      _id:     "$ipAddress",
      count:   { $sum: 1 },
      userIds: { $addToSet: "$userId" },
    },
  },
  { $match: { count: { $gte: MIN_REQUESTS } } },
  {
    $project: {
      ip:          "$_id",
      requests:    "$count",
      uniqueUsers: { $size: "$userIds" },
    },
  },
  { $sort: { requests: -1 } },
])
```

---

### F5. Shared Device Fingerprint across Users

One device fingerprint used by multiple users — indicates fake accounts operated from the same device.

**Source:** `Devices` — `fingerprint`, `userId`

```js
db.Devices.aggregate([
  {
    $group: {
      _id:     "$fingerprint",
      userIds: { $addToSet: "$userId" },
      count:   { $sum: 1 },
    },
  },
  { $match: { count: { $gt: 1 } } },
  {
    $project: {
      fingerprint: "$_id",
      userCount:   { $size: "$userIds" },
      userIds:     1,
    },
  },
  { $sort: { userCount: -1 } },
])
```

---

### F6. Suspicious Session after Admin Action

A new session is created immediately after an admin performs `userRevokeSessionByAdmin` or `userUpdatePasswordByAdmin` — attacker re-logging in after the account was secured.

**Source:** `Sessions.createdAt` + `ActivityLogs.action = adminSessionRevoke | adminUserUpdatePassword`

```js
db.ActivityLogs.aggregate([
  {
    $match: {
      action:    { $in: ["adminSessionRevoke", "adminUserUpdatePassword"] },
      createdAt: { $gte: ISODate("2026-01-01") },
    },
  },
  { $project: { userId: 1, actionAt: "$createdAt" } },
]).toArray().forEach(({ userId, actionAt }) => {
  const newSession = db.Sessions.findOne({
    userId,
    createdAt: {
      $gte: actionAt,
      $lte: new Date(actionAt.getTime() + 5 * 60 * 1000),
    },
  });
  if (newSession) {
    // Flag: new session after admin intervention → notify security team
  }
});
```

---

### F7. Forgot Password Token Abuse

A single user creates many forgot password tokens in a short window without completing a reset — bot scraping tokens or bypass attempt.

**Source:** `ForgotPasswords` — `userId`, `isUsed`, `createdAt`

```js
const WINDOW_HOURS = 24;
const THRESHOLD    = 3;

db.ForgotPasswords.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(Date.now() - WINDOW_HOURS * 3600000) },
      isUsed:    false,
    },
  },
  {
    $group: {
      _id:    "$userId",
      count:  { $sum: 1 },
      emails: { $addToSet: "$to" },
    },
  },
  { $match: { count: { $gte: THRESHOLD } } },
  { $sort: { count: -1 } },
])
```

---

### Fraud Signal Scoring

Combine signals into a single **risk score** per user for investigation prioritization:

| Signal | Weight |
|--------|--------|
| New session after admin revoke (< 5 minutes) | +50 |
| Impossible travel detected | +40 |
| New device after password change (< 1 hour) | +30 |
| Login from IP detected in credential stuffing | +30 |
| Fingerprint used by > 1 user | +25 |
| `passwordAttempt` ≥ max - 1 | +20 |
| Sign-up from IP with many accounts | +20 |
| Forgot password request ≥ threshold without reset | +15 |

**Action thresholds:**
| Risk Score | Action |
|------------|--------|
| 0–30 | Monitor |
| 31–60 | Flag for manual review |
| 61–90 | Require re-authentication + notify user |
| 91+ | Suspend account + notify security team |

> Risk score is calculated in the application layer after collecting signals above. Store in Redis with a short TTL (5–15 minutes) for real-time checking on every request.

---

## Implementation Notes

### Recommended Approach

1. **Expose via admin API** — create dedicated admin endpoints per module (e.g., `GET /admin/users/analytics/growth`) running the aggregations above
2. **Cache results** — use Redis with TTL (1 hour for daily stats, 5 minutes for real-time) to avoid overloading MongoDB
3. **Background pre-computation** — for heavy aggregations (percentiles, cross-collection joins), use BullMQ to pre-compute and store in an `AnalyticsSnapshot` collection
4. **Date range params** — all analytics endpoints must support `startDate` and `endDate` query params

### MongoDB Version Requirements

- `$percentile` operator requires **MongoDB 7.0+**
- For older versions, calculate percentiles in the application layer after fetching the full distribution

### Index Optimization

Ensure the following indexes exist for optimal query performance:

| Collection | Required Indexes |
|---|---|
| `Users` | `{ signUpAt: -1 }`, `{ deletedAt: 1, signUpAt: -1 }`, `{ status: 1, deletedAt: 1 }` |
| `Sessions` | `{ isRevoked: 1, expiredAt: -1 }`, `{ createdAt: -1 }`, `{ deviceOwnershipId: 1, isRevoked: 1 }` |
| `ActivityLogs` | `{ action: 1, createdAt: -1 }`, `{ userId: 1, action: 1, createdAt: -1 }` |
| `Notifications` | `{ type: 1, isRead: 1, createdAt: -1 }`, `{ userId: 1, priority: 1, isRead: 1, createdAt: -1 }` |
| `NotificationDeliveries` | `{ channel: 1, processedAt: 1, createdAt: -1 }` |
| `ForgotPasswords` | `{ isUsed: 1, createdAt: -1 }` |
| `TermPolicyUserAcceptances` | `{ termPolicyId: 1, acceptedAt: -1 }` |
| `Verifications` | `{ type: 1, isUsed: 1, expiredAt: -1, createdAt: -1 }` |
| `Devices` | `{ userId: 1, lastActiveAt: -1 }`, `{ fingerprint: 1 }`, `{ notificationProvider: 1 }`, `{ createdAt: -1 }` |
| `UserMobiles` | `{ isVerified: 1, countryId: 1 }` |
| `PasswordHistories` | `{ userId: 1, type: 1, createdAt: -1 }` |

> Most indexes above **already exist** in the schema — see `@@index` definitions in each model. New ones added here are marked where schema changes may be needed.