/**
 * Wraps a pool or client to count queries for testing purposes.
 * NOT imported in production code — only used in test scripts.
 */
export class QueryCounter {
  constructor(db) {
    this._db = db;
    this.count = 0;
    this.queries = [];
  }

  async query(text, params) {
    this.count++;
    const start = Date.now();
    const result = await this._db.query(text, params);
    this.queries.push({ text: text.trim().slice(0, 100), duration: Date.now() - start });
    return result;
  }

  async connect() {
    return this._db.connect();
  }

  reset() {
    this.count = 0;
    this.queries = [];
  }

  report() {
    return { total: this.count, queries: this.queries };
  }
}
