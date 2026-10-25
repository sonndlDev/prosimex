import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Parse a raw query-string value using the type of its default value.
 */
function parseValue(raw, defaultValue) {
  if (raw === null) return defaultValue;
  if (Array.isArray(defaultValue)) return raw ? raw.split(',') : [];
  if (typeof defaultValue === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaultValue;
  }
  if (typeof defaultValue === 'boolean') return raw === 'true';
  return raw;
}

/**
 * Serialize a value for the query string. Returns null when the param should be omitted.
 */
function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? value.join(',') : null;
  if (value === '') return null;
  return String(value);
}

/**
 * Keep a group of filter values in sync with the URL query string.
 *
 * - Reads initial values from the URL, so filters survive F5 / shared links.
 * - Writes changes back with `replace` (no history spam).
 * - Values equal to their default are removed from the URL.
 * - Params not listed in `defaults` are left untouched.
 *
 * @param {Object} defaults  e.g. { search: '', status: 'all', ids: [] }
 * @returns {[Object, Function]} [filters, setFilters]  setFilters accepts a full object or (prev) => next
 */
export function useUrlFilters(defaults) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = {};
  for (const key of Object.keys(defaults)) {
    filters[key] = parseValue(searchParams.get(key), defaults[key]);
  }

  const setFilters = (next) => {
    // Read the latest URL so consecutive setters in one handler do not clobber each other
    const params = new URLSearchParams(window.location.search);
    const current = {};
    for (const key of Object.keys(defaults)) {
      current[key] = parseValue(params.get(key), defaults[key]);
    }
    const resolved = typeof next === 'function' ? next(current) : next;

    for (const key of Object.keys(defaults)) {
      const value = resolved && key in resolved ? resolved[key] : defaults[key];
      const serialized = serializeValue(value);
      const defaultSerialized = serializeValue(defaults[key]);
      if (serialized === null || serialized === defaultSerialized) {
        params.delete(key);
      } else {
        params.set(key, serialized);
      }
    }

    const search = params.toString();
    navigate({ search: search ? `?${search}` : '' }, { replace: true });
  };

  return [filters, setFilters];
}

/**
 * Single-value variant of useUrlFilters, shaped like useState.
 *
 * @param {string} key
 * @param {*} defaultValue
 * @returns {[*, Function]}
 */
export function useUrlState(key, defaultValue) {
  const [filters, setFilters] = useUrlFilters({ [key]: defaultValue });
  const setValue = (next) => {
    setFilters((prev) => ({
      ...prev,
      [key]: typeof next === 'function' ? next(prev[key]) : next,
    }));
  };
  return [filters[key], setValue];
}
