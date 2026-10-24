/**
 * RequestLoader — batches all key requests in one tick, runs one query.
 * Lives only for one request. NOT a global cache.
 *
 * Usage:
 *   const loader = new RequestLoader(async (ids) => userDal.findByIds(ids));
 *   const user = await loader.load(userId);
 */
export class RequestLoader {
  constructor(batchFn, key = 'id') {
    this._batchFn = batchFn;
    this._key = key;
    this._pending = new Map(); // id -> { resolve, reject }
    this._scheduled = false;
  }

  load(id) {
    return new Promise((resolve, reject) => {
      this._pending.set(String(id), { resolve, reject });
      if (!this._scheduled) {
        this._scheduled = true;
        Promise.resolve().then(() => this._flush());
      }
    });
  }

  async _flush() {
    const pending = new Map(this._pending);
    this._pending.clear();
    this._scheduled = false;
    try {
      const ids = [...pending.keys()];
      const rows = await this._batchFn(ids);
      const map = new Map(rows.map(r => [String(r[this._key]), r]));
      for (const [id, { resolve }] of pending) {
        resolve(map.get(id) ?? null);
      }
    } catch (err) {
      for (const { reject } of pending.values()) {
        reject(err);
      }
    }
  }
}
