/**
 * SqlParams — manages query parameter list, returns $n placeholders.
 */
export class SqlParams {
  constructor() {
    this.values = [];
  }
  /** Adds a value, returns '$n' placeholder string. */
  add(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/**
 * Where — builds a WHERE clause without manually counting $n.
 * Uses '?' as placeholder in conditions; replaced with $n automatically.
 */
export class Where {
  #parts = [];

  constructor(params = new SqlParams()) {
    this.params = params;
  }

  /**
   * Add an AND condition. Use '?' for each value placeholder.
   * Throws if count of '?' != count of values.
   */
  and(condition, ...values) {
    const expected = (condition.match(/\?/g) || []).length;
    if (expected !== values.length) {
      throw new Error(`Where.and: need ${expected} values, got ${values.length}`);
    }
    let i = 0;
    this.#parts.push(condition.replace(/\?/g, () => this.params.add(values[i++])));
    return this;
  }

  /** Conditionally add an AND condition. */
  andIf(cond, condition, ...values) {
    return cond ? this.and(condition, ...values) : this;
  }

  /**
   * Add an OR group: w.andAny(sub => sub.or('a ILIKE ?', s).or('b ILIKE ?', s))
   */
  andAny(build) {
    const sub = new OrGroup(this.params);
    build(sub);
    if (sub.parts.length > 0) {
      this.#parts.push(`(${sub.parts.join(' OR ')})`);
    }
    return this;
  }

  toString() {
    return this.#parts.length ? `WHERE ${this.#parts.join(' AND ')}` : '';
  }
}

class OrGroup {
  constructor(params) {
    this.params = params;
    this.parts = [];
  }
  or(condition, ...values) {
    const expected = (condition.match(/\?/g) || []).length;
    if (expected !== values.length) {
      throw new Error(`OrGroup.or: need ${expected} values, got ${values.length}`);
    }
    let i = 0;
    this.parts.push(condition.replace(/\?/g, () => this.params.add(values[i++])));
    return this;
  }
}
