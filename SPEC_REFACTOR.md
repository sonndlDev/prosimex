# SPEC_REFACTOR — Refactor tầng truy cập dữ liệu sang Batch Loading

> **Cách dùng:** người dùng sẽ ra lệnh dạng
> `refactor module "<tên>" theo spec` hoặc `refactor modules "a", "b", "c" theo spec`.
> Khi nhận lệnh, agent **tự thực hiện toàn bộ quy trình ở mục 4** cho từng module, từ khảo sát tới commit,
> và chỉ dừng lại ở các tình huống liệt kê tại **mục 10**.
>
> Đọc **toàn bộ** file này trước mỗi lần thực hiện. File này là nguồn sự thật duy nhất. Nếu code hoặc tài liệu khác mâu thuẫn với file này, làm theo file này.

---

## 1. Mục tiêu

Tổ chức lại tầng truy cập dữ liệu cho dễ đọc, dễ maintain, dễ test, theo nguyên tắc:

1. **Giữ nguyên 100% output API và business logic.** Đây là ưu tiên cao nhất, cao hơn mọi mục tiêu "code đẹp".
2. Query chính chỉ lấy dữ liệu của **bảng gốc** cùng các khoá. Dữ liệu liên quan được nạp **theo lô (batch)** qua DAL của từng bảng, mỗi bảng chạy đúng **một query**, sau đó gắn ngược vào từng item.
3. Business logic nằm trong **entity thuần JS**, có unit test, không lặp lại giữa SQL và JS.
4. Không còn SQL dài và trùng lặp.

### Ngoài phạm vi

- Không đổi DB schema (bảng, cột, constraint, view, function).
- Không đổi routes, middleware, phân quyền, chữ ký (signature) của controller.
- Không sửa lỗi business. Lỗi phát hiện được chỉ **ghi lại** (mục 9), không sửa.
- Không thêm, nâng cấp hay gỡ dependency. Đặc biệt **không dùng query builder hay ORM** (Knex, Kysely, Prisma, TypeORM, Sequelize, ...).

---

## 2. Quy tắc bất biến

Vi phạm bất kỳ quy tắc nào dưới đây đều coi là refactor thất bại.

| # | Quy tắc |
|---|---|
| R1 | Response của mọi endpoint giống hệt trước refactor: cùng key, cùng **kiểu dữ liệu** (`"45.50"` khác `45.5`, `null` khác thiếu key), cùng thứ tự mảng, cùng format ngày, cùng HTTP status, cùng message lỗi. |
| R2 | Không bao giờ `await` một DAL bên trong vòng lặp theo từng item. Mọi quan hệ phải nạp theo batch. |
| R3 | Aggregate (`SUM`, `COUNT`, `MAX`...) trên bảng giao dịch phải làm trong SQL bằng `GROUP BY` theo khoá batch. Không kéo raw rows về JS để cộng. |
| R4 | Mọi điều kiện lọc (`deleted_at`, `factory_id`, trạng thái, phân quyền...) phải được sao chép **đúng từng chỗ** như SQL gốc. Có chỗ lọc, có chỗ không lọc thì giữ nguyên như vậy. |
| R5 | Filter, sort và phân trang phải được áp dụng **trong query chính** để số dòng và thứ tự trang không đổi. |
| R6 | Thao tác ghi giữ nguyên thứ tự bước và phạm vi transaction. |
| R7 | **Giá trị** đầu vào luôn truyền qua tham số (`$n`), không bao giờ nối vào chuỗi SQL. **Định danh** (tên cột, hướng sort) chỉ được nối khi lấy từ một whitelist hằng số trong code. |
| R8 | Không xoá code cũ trước khi characterization test của module đó pass. |
| R9 | Không sửa code của module khác ngoài phạm vi lệnh, trừ khi tạo hoặc mở rộng DAL dùng chung theo mục 3.3. |

---

## 3. Kiến trúc & quy ước

### 3.1 Luồng dữ liệu

```
Controller (không đổi)
   └─ Service
        ├─ <module> query chính           → bảng gốc + filter + sort + phân trang
        ├─ <module>.hydrator              → gom khoá → gọi DAL các bảng liên quan (song song) → gắn vào item
        ├─ domain/*.entity                → tính business thuần JS
        └─ <module>.mapper                → trả đúng shape + kiểu dữ liệu response cũ
```

### 3.2 Công nghệ

- Dùng **driver `pg` và cơ chế kết nối sẵn có** của project: pool, `BaseRepository.query`, `BaseRepository.transaction(client)` hoặc tương đương. Không tạo pool thứ hai.
- SQL được viết tay, kèm helper ghép điều kiện `Where`/`SqlParams` (mục 3.6) để không phải tự đếm `$n`.
- Batch theo khoá dùng `= ANY($1::<type>[])` với **một tham số là mảng**, không dùng `IN ($1, $2, ...)`.
- Giữ ngôn ngữ hiện tại của project (JS hoặc TS). Với JS, dùng JSDoc cho entity và DAL.
- Tôn trọng quy ước thư mục, cách đặt tên, lint và format sẵn có. Cấu trúc dưới đây là **tương đối**, cần điều chỉnh cho khớp với project.

### 3.3 Cấu trúc thư mục

```
<src>/
  shared/
    db/sql-builder.js            # SqlParams, Where (mục 3.6) + test
    db/query-counter.js          # đếm/log query dùng trong test (mục 4, bước 5)
    batch/batch.js               # helper batch (mục 3.5) + test
    batch/request-loader.js      # cache theo request (mục 3.7) + test
  dal/                           # DAL theo BẢNG, dùng chung toàn project
    <table>.dal.js
  modules/<module>/
    domain/                      # entity + business rule + test
    <module>.filters.js          # buildWhere(filters) dùng chung cho list & count
    <module>.hydrator.js
    <module>.mapper.js
    <module>.service.js
    <module>.controller.js       # KHÔNG đổi signature
    <module>.routes.js           # KHÔNG đổi
    queries/                     # SQL giữ nguyên dạng (loại C, mục 3.11)
    __legacy__/                  # repository cũ, xoá khi đã verify
docs/refactor/
  PROGRESS.md
  DISCREPANCIES.md
  INDEXES.md
  DAL_REGISTRY.md
  modules/<module>.md
tests/characterization/
  capture.js
  compare.js
  cases/<module>.json
  fixtures/<module>/<case-id>.json
```

**Quy tắc sở hữu DAL:**

- DAL được tổ chức **theo bảng**, không theo module. Mỗi bảng có đúng một file DAL.
- Trước khi tạo DAL, **luôn kiểm tra `DAL_REGISTRY.md`** và thư mục `dal/`. Nếu đã có thì dùng lại hoặc **bổ sung hàm mới**. Tuyệt đối không tạo DAL thứ hai cho cùng một bảng.
- Không được đổi hành vi của hàm DAL đã có, vì module khác đang dùng. Cần hành vi khác thì thêm hàm mới hoặc thêm option có giá trị mặc định giữ nguyên hành vi cũ.
- Cập nhật `DAL_REGISTRY.md` mỗi khi thêm hàm: tên hàm, mô tả, điều kiện lọc, module nào đang dùng.

### 3.4 Quy ước DAL

```javascript
import { db } from '../shared/db/index.js'; // pool/BaseRepository sẵn có của project

const SQL_FIND_BY_IDS = `
  SELECT id, name
  FROM customers
  WHERE id = ANY($1::int[])
    AND deleted_at IS NULL
`;

export const customerDal = {
  /** Lấy khách hàng theo danh sách id. Lọc deleted_at IS NULL. */
  async findByIds(ids, client = db) {
    if (!ids.length) return [];
    const { rows } = await client.query(SQL_FIND_BY_IDS, [ids]);
    return rows;
  },
};
```

- Tham số cuối luôn là `client` tuỳ chọn, mặc định là pool hoặc đối tượng query mặc định của project. Khi chạy trong transaction, truyền `client` của transaction vào.
- Câu SQL tĩnh đặt ở **hằng số đầu file** với tên `SQL_<TÊN_HÀM>`, không viết inline trong thân hàm.
- **Kiểu của mảng trong `ANY`** phải khớp kiểu thực tế của cột (`int[]`, `bigint[]`, `uuid[]`, `text[]`), lấy từ `information_schema.columns` ở bước 1. Sai kiểu sẽ gây lỗi `operator does not exist` hoặc làm mất index.
- Quy ước đặt tên:
  - `findById(id)` → một row hoặc `undefined`
  - `findByIds(ids)` → mảng row
  - `findBy<Field>s(values)` → mảng row, ví dụ `findByOrderIds`
  - `sum<Metric>By<Keys>(keys)` → mảng row đã `GROUP BY`
  - `count<...>`, `insert`, `update<...>`, `softDelete`
- Mảng khoá rỗng → trả `[]`, không query.
- Chỉ `SELECT` các cột cần. Chỉ dùng `*` khi response cũ trả toàn bộ cột.
- Khoá ghép (ví dụ `(order_id, product_id)`): ưu tiên lọc theo khoá cha (`order_id = ANY($1)`) rồi ghép ở JS. Nếu bắt buộc lọc theo cặp, dùng `unnest($1::int[], $2::int[]) AS k(a, b)` rồi JOIN.
- Thứ tự kết quả: nếu thứ tự phần tử con ảnh hưởng tới response, DAL phải `ORDER BY` tường minh.
- Mỗi câu SQL trong DAL nên dưới khoảng **30 dòng**. Dài hơn thì xem lại xem có nên tách quan hệ ra hydrator không.

### 3.5 Helper batch (`shared/batch/batch.js`)

Phải có và có unit test:

```javascript
export const uniq = (values) => [...new Set(values.filter(v => v != null))];
export const keyBy = (rows, key) => new Map(rows.map(r => [String(r[key]), r]));
export function groupBy(rows, key) { /* Map<string, row[]>, giữ thứ tự xuất hiện */ }
export const compositeKey = (...values) => values.map(String).join('|');
export async function chunked(keys, size, load) { /* chia lô, gọi load, nối kết quả */ }

/** Quan hệ n-1 / 1-1. `fields` và `as` có thể là mảng song song: nhiều khoá cùng trỏ vào một bảng thì chỉ chạy 1 query. */
export async function attachOne(items, { fields, as, load, key = 'id' }) {}

/** Quan hệ 1-n. */
export async function attachMany(items, { field = 'id', as, load, foreignKey }) {}
```

- **Key của Map luôn là `String(value)`.** Driver `pg` trả `int4` dạng number nhưng `int8`/`numeric` dạng string. Nếu không chuẩn hoá, `Map.get` sẽ trả `undefined` mà không báo lỗi.
- Không có dữ liệu liên quan → `null` (attachOne) hoặc `[]` (attachMany), không để `undefined`.
- Vì `ANY($1)` chỉ dùng một tham số nên không bị giới hạn số tham số của Postgres. Chỉ dùng `chunked` khi một lô vượt **10.000 khoá**, để tránh query quá nặng.

### 3.6 Helper SQL (`shared/db/sql-builder.js`)

Mục đích: ghép SQL động mà **không tự đếm `$n`**. Phải có và có unit test.

```javascript
/** Quản lý danh sách tham số, trả về placeholder $n. */
export class SqlParams {
  values = [];
  /** Thêm một giá trị, trả về '$n'. */
  add(value) { this.values.push(value); return `$${this.values.length}`; }
}

/** Ghép điều kiện WHERE. Dùng `?` làm placeholder trong điều kiện; helper tự đổi thành $n. */
export class Where {
  #parts = [];
  constructor(params = new SqlParams()) { this.params = params; }

  and(condition, ...values) {
    const expected = (condition.match(/\?/g) || []).length;
    if (expected !== values.length) throw new Error(`Where.and: cần ${expected} giá trị, nhận ${values.length}`);
    let i = 0;
    this.#parts.push(condition.replace(/\?/g, () => this.params.add(values[i++])));
    return this;
  }

  andIf(cond, condition, ...values) { return cond ? this.and(condition, ...values) : this; }

  /** Nhóm OR: w.andAny(sub => sub.or('a ILIKE ?', s).or('b ILIKE ?', s)) */
  andAny(build) { /* tạo nhóm (... OR ...) dùng chung this.params */ }

  toString() { return this.#parts.length ? `WHERE ${this.#parts.join(' AND ')}` : ''; }
}
```

Ví dụ sử dụng:

```javascript
// <module>.filters.js
export function buildWhere(f, params = new SqlParams()) {
  const w = new Where(params).and('o.deleted_at IS NULL');
  w.andIf(f.factory_id, 'o.factory_id = ?', f.factory_id);
  w.andIf(f.status === 'INCOMPLETE', `o.status <> 'DONE'`);
  // ...
  return w;
}

// list: dùng chung params để LIMIT/OFFSET đánh số tiếp
const params = new SqlParams();
const where = buildWhere(filters, params);
const sql = `SELECT o.* FROM orders o ${where} ${ORDER_BY} LIMIT ${params.add(limit)} OFFSET ${params.add(offset)}`;
const { rows } = await db.query(sql, params.values);
```

Lưu ý:

- **Ký tự `?` trong SQL.** Helper coi mọi `?` trong điều kiện là placeholder. Nếu cần toán tử jsonb `?`, `?|`, `?&` hoặc regex có chứa `?`, **không** đưa vào `Where.and`. Dùng hàm tương đương (`jsonb_exists`, `jsonb_exists_any`, `jsonb_exists_all`) hoặc ghép bằng `params.add(...)` trực tiếp.
- `count` và `list` phải gọi **cùng** hàm `buildWhere` để tổng số và dữ liệu luôn khớp nhau.
- Phần sort động: map từ input sang biểu thức SQL qua **object whitelist** (R7), không nối trực tiếp input.

### 3.7 Cache theo request

Trong cùng một request, nhiều hydrator có thể cần cùng một bảng (ví dụ `users`). Dùng `request-loader.js`: một loader theo từng bảng, gom mọi khoá được yêu cầu trong cùng một tick, rồi chạy một query. Loader **chỉ sống trong một request**, không cache giữa các request, không cache dữ liệu ghi.

Chỉ áp dụng khi cùng một request thật sự load trùng bảng. Không bắt buộc cho mọi trường hợp.

### 3.8 Query chính

- `FROM <bảng gốc>`, chỉ select cột của bảng gốc.
- Filter dựa trên bảng khác → dùng `EXISTS (SELECT 1 ...)`, không JOIN để lấy cột.
- **Sort hoặc phân trang dựa trên cột của bảng khác** → được JOIN, nhưng chỉ để sort. Không lấy thêm cột qua JOIN đó; dữ liệu hiển thị vẫn nạp qua hydrator.
- Logic filter đặt trong `buildWhere(filters)` và dùng chung cho cả `list` và `count`.
- `ORDER BY` phải giữ **đúng ngữ nghĩa** cũ, kể cả các biểu thức kỳ quặc. Mọi tie-breaker đều phải giữ. Đặt `ORDER BY` thành hằng số có tên.

### 3.9 Entity (domain)

- Thuần JS: không import `pg`, không I/O, không phụ thuộc request.
- Constructor nhận row thô và tự parse kiểu.
- Mỗi business rule là một getter hoặc method có tên rõ nghĩa, có JSDoc tiếng Việt mô tả quy tắc và trích dẫn vị trí SQL gốc.
- Nếu cùng một khái niệm được tính **khác nhau** ở các endpoint cũ, entity nhận **option bắt buộc** (không có default) để chọn hành vi, và ghi vào `DISCREPANCIES.md`. Không được hợp nhất.
- Phép làm tròn phải tái tạo đúng **thứ tự làm tròn** của SQL gốc (làm tròn từng phần rồi mới gộp, hay gộp rồi mới làm tròn).
- Nếu float của JS gây lệch so với `numeric` của Postgres ở chữ số cuối, chuyển sang tính bằng số nguyên (ví dụ nhân 100 rồi làm tròn). Nếu vẫn lệch, xem mục 10. Không nới tolerance của test.

### 3.10 Mapper & bảo toàn kiểu dữ liệu

Mapper là nơi duy nhất quyết định shape và kiểu dữ liệu của response. Lấy **fixture thực tế** làm chuẩn, không đoán.

Bảng tham chiếu cách SQL cũ serialize dữ liệu:

| Nguồn trong SQL cũ | Kiểu nhận được ở JS |
|---|---|
| `integer`, `smallint` | `number` |
| `bigint`, `numeric`, `COUNT()`, `SUM()`, `AVG()`, `ROUND()` | `string`. Ví dụ `ROUND(x,2)` → `"45.50"`, luôn đủ số chữ số thập phân |
| `COALESCE(numeric_expr, 0)` | `string` (ví dụ `"0"`) |
| `timestamp`/`date` ở top-level | `Date` → JSON có `Z`, phụ thuộc timezone Node và type parser của `pg` |
| `timestamp`/`date` bên trong `json_build_object`/`json_agg` | `string` theo format Postgres, thường không có `Z` |
| `numeric` bên trong `json_build_object` | `number` |
| `json`/`jsonb` | object/array |
| `json_agg` trên tập rỗng | `null`, thường được bọc bằng `COALESCE(..., '[]')` |

Kiểm tra xem project có tuỳ biến `pg.types.setTypeParser` hay không. Nếu có, bảng trên thay đổi theo, nên luôn đối chiếu fixture.

Mapper không được để lộ các key trung gian của hydrator ra response.

### 3.11 Tiêu chí phân loại hàm repository

Mỗi hàm repository cũ được xếp vào **một** loại, và xử lý theo loại đó:

| Loại | Dấu hiệu | Cách xử lý |
|---|---|---|
| **A — Danh sách/chi tiết** | Lấy bản ghi gốc, JOIN để lấy tên hoặc thông tin hiển thị, `json_agg` con | Batch loading đầy đủ |
| **B — Có tính toán business** | CASE, công thức %, trạng thái suy diễn | Aggregate qua DAL `sum...By...`, business chuyển vào entity |
| **C — Báo cáo tổng hợp lớn** | Window function, pivot, nhiều cấp GROUP BY, chạy trên toàn bộ dữ liệu, không có khoá batch tự nhiên | **Giữ SQL**, chuyển vào `<module>/queries/<tên>.sql.js` dưới dạng hằng số có tên, các đoạn trùng lặp tách thành fragment dùng chung. Không ép theo batch |
| **D — Ghi dữ liệu** | INSERT/UPDATE/DELETE, transaction | Chuyển sang DAL, dùng cơ chế transaction sẵn có, truyền `client` xuyên suốt, giữ nguyên thứ tự bước |
| **E — Đơn giản** | Một bảng, ít điều kiện | Chuyển sang DAL, không cần hydrator |

Một hàm loại C mà ép vào batch sẽ thành sai. Khi phân vân giữa B và C, chọn C.

---

## 4. Quy trình thực hiện khi nhận lệnh

Với mỗi module trong lệnh, chạy **tuần tự** các bước dưới đây. Nhiều module thì làm xong module này (commit) rồi mới sang module tiếp theo.

### Bước 0 — Bootstrap (chỉ chạy lần đầu, bỏ qua nếu đã xong)

Kiểm tra `docs/refactor/PROGRESS.md`. Nếu chưa có mục `bootstrap: done`:

1. Khảo sát project: framework, cách kết nối DB (pool, `BaseRepository`, cơ chế transaction), `pg.types.setTypeParser`, test runner, lint, cấu trúc module, migration tool.
2. Tạo `shared/db/sql-builder.js` (mục 3.6) kèm unit test, bao gồm test cho các case lỗi số lượng placeholder.
3. Tạo `shared/db/query-counter.js`: bọc `query` của pool/client trong môi trường test để đếm số query và đo thời gian, không ảnh hưởng code production.
4. Tạo `shared/batch/batch.js`, `request-loader.js` kèm unit test.
5. Tạo khung characterization test (mục 6) cùng script `npm run test:characterization`.
6. Tạo các file trong `docs/refactor/` với nội dung khởi tạo.
7. Kiểm tra biến môi trường cho DB test (ưu tiên `TEST_DATABASE_URL` hoặc biến tương đương mà project đang dùng). **Không có DB test → dừng** (mục 10).
8. Nếu project chưa có test runner → dừng và hỏi (mục 10).
9. Commit `chore(refactor): bootstrap batch-loading infrastructure`, ghi `bootstrap: done` vào `PROGRESS.md`.

### Bước 1 — Khảo sát module

Đọc toàn bộ module: routes, controller, service, repository, các util được import, và các module khác đang gọi vào repository hay service của module này (dùng `grep`).

Ghi kết quả vào `docs/refactor/modules/<module>.md`, gồm:

1. **Endpoint**: method, path, controller, service, các hàm repository được gọi.
2. **Hàm repository**: với mỗi hàm ghi vị trí file và dòng, loại theo mục 3.11, các bảng đọc/ghi, có transaction hay không.
3. **Quan hệ dữ liệu**: bảng gốc, các bảng liên quan, khoá, kiểu quan hệ (1-1, n-1, 1-n), điều kiện lọc của từng JOIN (đặc biệt là `deleted_at`).
4. **Business rule**: liệt kê từng quy tắc đang nằm trong SQL hoặc JS, với vị trí và mô tả bằng lời. Đánh dấu các quy tắc được tính **ở nhiều nơi** và ghi rõ chỗ nào tính khác chỗ nào.
5. **Kiểu dữ liệu thực tế** của các cột id/FK (truy vấn `information_schema.columns`), dùng cho cast trong `ANY($1::<type>[])`.
6. **Phụ thuộc chéo**: module hoặc util khác đang dùng repository/service này, và DAL đã có trong `DAL_REGISTRY.md` có thể tái sử dụng.
7. **Kế hoạch**: danh sách DAL cần tạo hoặc bổ sung, entity, hydrator, mapper; các hàm giữ SQL (loại C) và lý do.
8. **Rủi ro**: chỗ thứ tự không xác định (`json_agg` không có `ORDER BY`, `LIMIT` không có `ORDER BY` đầy đủ), chỗ dễ lệch kiểu dữ liệu, chỗ phụ thuộc timezone, chỗ dùng toán tử jsonb `?`.

Bước này **không sửa code**.

### Bước 2 — Xây bộ case và chụp fixture

1. Sinh `tests/characterization/cases/<module>.json` cho **mọi endpoint đọc** của module. Chọn dữ liệu thật từ DB test bằng query khảo sát, sao cho bao phủ:
   - từng nhánh `CASE`/`if` của business rule tìm được ở bước 1
   - từng filter đơn lẻ, các tổ hợp filter phổ biến, giá trị đặc biệt (`'ALL'`, chuỗi rỗng, giá trị không hợp lệ)
   - trang đầu, trang giữa, trang cuối, trang rỗng
   - bản ghi thiếu quan hệ (FK null, quan hệ đã xoá mềm, không có bản ghi con)
   - bản ghi có dữ liệu con lớn nhất
   - id không tồn tại (404)
2. Chạy `capture.js` với **code hiện tại**, trước khi sửa bất kỳ dòng nào, để ghi fixture. Đồng thời ghi lại **số query và thời gian** của code cũ cho từng case.
3. Endpoint ghi (POST/PUT/DELETE): ghi case vào file nhưng verify theo cách ở mục 6.3.
4. Commit `test(<module>): characterization fixtures`.

### Bước 3 — Chuyển code cũ vào legacy

Di chuyển repository cũ vào `modules/<module>/__legacy__/`, giữ nguyên nội dung. Cập nhật import để code vẫn chạy y như cũ. Chạy lại `compare.js`: phải pass 100%. Đây là phép kiểm tra rằng bộ test hoạt động đúng.

### Bước 4 — Refactor

Thực hiện theo kế hoạch ở bước 1, theo thứ tự:

1. DAL (tạo mới hoặc bổ sung hàm vào DAL dùng chung) và cập nhật `DAL_REGISTRY.md`.
2. Entity và business rule, kèm unit test bao phủ mọi nhánh tìm được ở bước 1.
3. `buildWhere` và query chính.
4. Hydrator.
5. Mapper.
6. Service: chuyển từng hàm sang luồng mới. Hàm loại C chuyển sang `queries/*.sql.js`.
7. Hàm ghi: dùng **cơ chế transaction sẵn có** (ví dụ `BaseRepository.transaction(async (client) => ...)`), truyền `client` vào mọi DAL trong transaction. Các util dùng chung đang nhận `client` của `pg` được gọi trực tiếp với cùng `client`, không đổi signature.

Sau mỗi hàm service được chuyển, chạy `compare.js` cho các case liên quan. Không dồn tới cuối mới chạy.

### Bước 5 — Kiểm chứng

1. `npm run test:characterization -- <module>`: phải pass 100%. Nếu lệch, xử lý theo mục 6.2.
2. Chạy unit test, lint, và build/typecheck nếu có.
3. **Đếm số query** cho từng endpoint bằng `query-counter`. Số query phải là hằng số, không tăng theo số item. Ghi kết quả vào `modules/<module>.md`.
4. **Đo thời gian** phản hồi mới, so với số đo của code cũ ở bước 2, trên các case lớn nhất. Ghi lại. Nếu chậm hơn 30% → xem mục 10.
5. Đề xuất index cho các cột dùng trong `= ANY(...)`/`GROUP BY` mới, ghi vào `INDEXES.md`. Không tự tạo migration.
6. Rà lại diff:
   - không còn SQL trong service
   - không có `await` trong vòng lặp
   - không có DAL trùng bảng
   - không có giá trị đầu vào nào bị nối vào chuỗi SQL
   - mọi `ANY` đều có cast kiểu mảng đúng

### Bước 6 — Dọn dẹp & commit

1. Xoá `__legacy__` của module **chỉ khi** bước 5 pass. Đồng thời xoá code của `capture.js` gắn với legacy của module này, nhưng **giữ lại fixture**.
2. Cập nhật `PROGRESS.md`, `DISCREPANCIES.md`, `DAL_REGISTRY.md`, `modules/<module>.md`.
3. Commit `refactor(<module>): batch-loading DAL`.

### Bước 7 — Báo cáo

In ra tóm tắt ngắn cho người dùng:

- Các endpoint đã refactor, số dòng SQL trước/sau.
- Số query mỗi endpoint trước/sau, thời gian trước/sau.
- DAL đã tạo hoặc bổ sung.
- Các mục mới thêm vào `DISCREPANCIES.md`.
- Index đề xuất.
- Những gì giữ nguyên SQL (loại C) và lý do.

---

## 5. Làm việc qua nhiều phiên

- `PROGRESS.md` ghi trạng thái từng module ở mức **bước** (ví dụ `orders: step 4 – hydrator done, mapper pending`). Phiên sau đọc vào là làm tiếp được, không phải làm lại.
- Mỗi bước kết thúc bằng trạng thái build xanh và cập nhật `PROGRESS.md`.
- Nếu nhận lệnh cho một module đã `done`, báo cho người dùng và không làm lại, trừ khi được yêu cầu rõ.
- Nếu một module đang dở dang, tiếp tục từ bước đã ghi.

---

## 6. Characterization test

### 6.1 Nguyên tắc

- Chạy trên **DB test hoặc bản sao**, tuyệt đối không chạy trên production.
- So sánh **deep strict equal**: so cả kiểu dữ liệu, key, thứ tự mảng. Riêng key của object được sort trước khi so.
- Fixture được chụp từ code cũ **trước khi sửa** và commit vào repo.
- Gọi ở tầng **service** (hoặc HTTP nếu project đã có sẵn công cụ test HTTP), với cùng input.

### 6.2 Xử lý khi lệch

1. Mặc định là code mới sai → sửa code mới.
2. Chỉ khi chứng minh được lệch đến từ **tính không xác định của code cũ** (ví dụ `json_agg` không có `ORDER BY`, sort không đủ tie-breaker) thì mới được:
   - thêm whitelist **theo từng case và từng field cụ thể** (không whitelist cả endpoint), kèm lý do,
   - ghi vào `DISCREPANCIES.md`,
   - và nếu được, làm cho code mới có thứ tự xác định, khớp với thứ tự xuất hiện phổ biến nhất trong fixture.
3. Mọi trường hợp khác → dừng (mục 10).

### 6.3 Endpoint ghi

Với mỗi case: chạy trong transaction, gọi code (cũ khi capture, mới khi compare), chụp lại **trạng thái các bảng bị ảnh hưởng** (chỉ các row liên quan) cùng response, rồi rollback. Các cột tự sinh (`id`, `created_at`, `updated_at`, timestamp trong audit log) được chuẩn hoá thành placeholder trước khi so sánh.

Nếu cơ chế transaction của project tự commit (không cho phép rollback từ bên ngoài), dùng `SAVEPOINT` hoặc chạy trên schema/DB test được reset lại sau mỗi case.

---

## 7. Phân quyền & bảo mật

- Các điều kiện mang tính phân quyền (ví dụ `factory_id`, tenant, phạm vi người dùng) phải xuất hiện ở **mọi** query liên quan giống như SQL cũ, kể cả trong các DAL được hydrator gọi, nếu SQL cũ có áp dụng ở đó.
- Hydrator không được nạp dữ liệu mà query cũ không trả về. Ví dụ, SQL cũ lọc quan hệ đã xoá thì DAL mới cũng phải lọc.
- Tuân thủ R7: chỉ nối định danh lấy từ whitelist hằng số.
- Không log dữ liệu nhạy cảm khi bật `query-counter`.

---

## 8. Hiệu năng

- Một endpoint loại A/B sau refactor thường có `1 + số quan hệ` query. Các query độc lập phải chạy song song bằng `Promise.all`. Chỉ chạy tuần tự khi quan hệ lồng nhau thật sự (cần khoá từ bước trước).
- **Lưu ý khi chạy song song trong transaction:** một `client` của `pg` chỉ thực thi một query tại một thời điểm. Trong transaction, `Promise.all` vẫn đúng nhưng các query sẽ tự xếp hàng. Không mở thêm kết nối ngoài transaction để chạy song song, vì như vậy sẽ đọc lệch dữ liệu.
- Nếu query cũ dùng subquery tương quan tính cho **toàn bộ bảng** trước khi `LIMIT`, code mới chỉ tính cho các khoá của trang hiện tại. Đây là cải thiện được phép, vì output không đổi.

---

## 9. Tài liệu bắt buộc

| File | Nội dung |
|---|---|
| `PROGRESS.md` | Trạng thái bootstrap và từng module theo bước |
| `DAL_REGISTRY.md` | Mỗi bảng: file DAL, danh sách hàm, điều kiện lọc, module đang dùng |
| `DISCREPANCIES.md` | Mỗi mục: mã (`D-<module>-<n>`), mô tả, vị trí code cũ, ví dụ dữ liệu cụ thể từ fixture, hành vi đang giữ, đề xuất sửa. Ghi mọi điểm không nhất quán, lỗi tiềm ẩn, rủi ro bảo mật (ví dụ trả object `error` ra client), rủi ro overflow, thứ tự không xác định, logic dựa vào so khớp chuỗi |
| `INDEXES.md` | Index đề xuất, câu lệnh `CREATE INDEX` mẫu, lý do, `EXPLAIN` nếu có |
| `modules/<module>.md` | Kết quả bước 1, cùng số liệu query và thời gian ở bước 5 |

---

## 10. Điểm dừng bắt buộc

Ngoài các tình huống dưới đây, agent **tự quyết định và tiếp tục** mà không hỏi. Khi gặp một trong các tình huống này, agent phải dừng, cập nhật `PROGRESS.md`, và báo rõ: vấn đề là gì, các phương án, và phương án đề xuất.

1. Không có DB test / bản sao DB để chạy characterization test.
2. Cần cài **bất kỳ** package nào (test runner, thư viện decimal, công cụ test HTTP...).
3. Characterization test lệch mà không thuộc trường hợp được phép ở mục 6.2.
4. Để giữ đúng output buộc phải thay đổi DB schema, hoặc đổi signature của util/hàm mà module khác đang dùng.
5. Thời gian phản hồi mới chậm hơn cũ trên 30% ở case lớn nhất, và không cải thiện được bằng cách tổ chức lại query.
6. Module phụ thuộc chặt vào một module khác chưa refactor, đến mức không thể refactor riêng.
7. Phát hiện lỗi bảo mật hoặc lỗi dữ liệu nghiêm trọng đang xảy ra trong code hiện tại (ví dụ lộ dữ liệu giữa các nhà máy). Vẫn ghi vào `DISCREPANCIES.md`, nhưng phải báo ngay.

Agent **không được** dừng để hỏi về: cách đặt tên, chia file, chọn loại (A–E) của một hàm, hay việc ghi một discrepancy. Tự quyết theo spec và ghi lại lý do trong `modules/<module>.md`.

---

## 11. Định nghĩa hoàn thành cho một module

- [ ] `modules/<module>.md` đầy đủ 8 mục ở bước 1, cùng số liệu ở bước 5
- [ ] Fixture được chụp từ code cũ và đã commit
- [ ] Characterization test pass 100% (whitelist nếu có đều hợp lệ theo mục 6.2)
- [ ] Unit test của entity bao phủ mọi nhánh business đã liệt kê
- [ ] Không còn SQL trong service; hàm loại C nằm trong `queries/*.sql.js` có tên rõ ràng
- [ ] Không có `await` DAL trong vòng lặp; số query mỗi endpoint là hằng số
- [ ] Không có DAL trùng bảng; `DAL_REGISTRY.md` đã cập nhật
- [ ] Không có giá trị đầu vào nào bị nối vào SQL; mọi `ANY` có cast kiểu đúng
- [ ] Không thêm dependency mới
- [ ] Controller, routes, middleware không đổi
- [ ] `__legacy__` của module đã xoá
- [ ] Lint, unit test, build pass
- [ ] `PROGRESS.md`, `DISCREPANCIES.md`, `INDEXES.md` đã cập nhật
- [ ] Đã commit và in báo cáo bước 7
