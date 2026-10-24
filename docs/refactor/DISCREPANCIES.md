# DISCREPANCIES

Format: D-<module>-<n> | Description | Location | Behavior kept

---

## D-customer-1 | Error object leaked to client on 500

**Location:** `customer.controller.js` original lines 35, 82, 137
**Description:** `res.status(500).json({ message: "...", error })` sends the raw `error` object (including stack trace) to the client on 500 responses. This is a security risk — stack traces and internal error details should not be sent to clients.
**Behavior kept:** Yes — the new controller replicates the same `error` field in 500 responses to preserve exact API shape.
**Recommendation:** Replace `error` with `undefined` or a sanitized string in production.

---

## D-customer-2 | Fragile regex-based WHERE qualifier in original getCustomers

**Location:** `customer.controller.js` original lines 26-28
**Description:** The original uses `.replace(/deleted_at/g, 'c.deleted_at').replace(/name/g, 'c.name').replace(/code/g, 'c.code')` on the WHERE string to add `c.` prefixes. This is fragile — any column/alias name change would silently break it. The new `buildWhere` uses explicit `c.` prefixes from the start.
**Behavior kept:** Semantically equivalent output; the replacement is avoided by writing correct SQL directly.

---

## D-customer-3 | `c.*` includes `deleted_at` and `modified_time` in list response

**Location:** `customer.controller.js` original line 22 (`SELECT c.*`)
**Description:** The original `SELECT c.*` returns ALL columns including `deleted_at` (always null for active records) and `modified_time`. The new DAL explicitly selects these columns to match exactly.
**Behavior kept:** Yes — `customers.dal.js` SELECT_COLS includes `deleted_at` and `modified_time`.

---

## D-customer-4 | `contact_info` duplicates `address` in list response

**Location:** `customer.controller.js` original line 22 (`c.address as contact_info`)
**Description:** The list response includes both `address` and `contact_info` with the same value. This appears to be a legacy alias kept for backward compatibility with clients that may reference either field.
**Behavior kept:** Yes — `customers.dal.js` SELECT_COLS includes `c.address AS contact_info`.
