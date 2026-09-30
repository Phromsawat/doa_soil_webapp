// query.ts — "local mode" (ไม่มี Supabase key): ตัวจำลอง query builder แบบ supabase-js
// รองรับเฉพาะ method ที่แอปนี้ใช้จริง: select / insert / update / upsert / delete
// + eq / neq / in / gt / gte / lt / lte / ilike / is / or / order / range / limit / single / maybeSingle
//
// builder สร้าง QuerySpec แล้วส่งให้ executor:
//   - ฝั่ง server: รันตรงกับไฟล์ local-db/db.json (engine.ts)
//   - ฝั่ง browser: POST ไป /api/local-db

export const LOCAL_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const LOCAL_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@local.test",
  phone: "",
  is_anonymous: false,
  user_metadata: { full_name: "ผู้ดูแลระบบ (local)" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
}

export type FilterOp = "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "ilike" | "is"

export interface QuerySpec {
  table: string
  action: "select" | "insert" | "update" | "upsert" | "delete"
  columns: string | null // select list (หรือ returning หลัง insert/update)
  count: boolean
  head: boolean
  filters: { op: FilterOp; col: string; val: unknown }[]
  ors: string[]
  order: { col: string; asc: boolean }[]
  range: [number, number] | null
  limit: number | null
  single: "single" | "maybe" | null
  values: unknown
  onConflict: string | null
}

export interface QueryResult {
  data: unknown
  error: { message: string } | null
  count: number | null
}

export type Executor = (spec: QuerySpec) => Promise<QueryResult>

export class LocalQuery implements PromiseLike<QueryResult> {
  private spec: QuerySpec

  constructor(table: string, private exec: Executor) {
    this.spec = {
      table,
      action: "select",
      columns: null,
      count: false,
      head: false,
      filters: [],
      ors: [],
      order: [],
      range: null,
      limit: null,
      single: null,
      values: null,
      onConflict: null,
    }
  }

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    // หลัง insert/update -> เป็น returning columns
    this.spec.columns = columns
    if (opts?.count) this.spec.count = true
    if (opts?.head) this.spec.head = true
    return this
  }
  insert(values: unknown) {
    this.spec.action = "insert"
    this.spec.values = values
    return this
  }
  update(values: unknown) {
    this.spec.action = "update"
    this.spec.values = values
    return this
  }
  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.spec.action = "upsert"
    this.spec.values = values
    this.spec.onConflict = opts?.onConflict ?? null
    return this
  }
  delete() {
    this.spec.action = "delete"
    return this
  }

  private f(op: FilterOp, col: string, val: unknown) {
    this.spec.filters.push({ op, col, val })
    return this
  }
  eq(col: string, val: unknown) { return this.f("eq", col, val) }
  neq(col: string, val: unknown) { return this.f("neq", col, val) }
  in(col: string, val: unknown[]) { return this.f("in", col, val) }
  gt(col: string, val: unknown) { return this.f("gt", col, val) }
  gte(col: string, val: unknown) { return this.f("gte", col, val) }
  lt(col: string, val: unknown) { return this.f("lt", col, val) }
  lte(col: string, val: unknown) { return this.f("lte", col, val) }
  ilike(col: string, val: string) { return this.f("ilike", col, val) }
  is(col: string, val: unknown) { return this.f("is", col, val) }
  or(expr: string) {
    this.spec.ors.push(expr)
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.order.push({ col, asc: opts?.ascending !== false })
    return this
  }
  range(from: number, to: number) {
    this.spec.range = [from, to]
    return this
  }
  limit(n: number) {
    this.spec.limit = n
    return this
  }
  single() {
    this.spec.single = "single"
    return this
  }
  maybeSingle() {
    this.spec.single = "maybe"
    return this
  }

  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return this.exec(this.spec).then(onfulfilled, onrejected)
  }
  catch(onrejected: (reason: unknown) => unknown) {
    return this.exec(this.spec).catch(onrejected)
  }
}

// -------------------------------------------------------------------- client
type AuthCallback = (event: string, session: { user: typeof LOCAL_USER } | null) => void

export function createLocalClient(exec: Executor) {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null })
  const session = { user: LOCAL_USER, access_token: "local", refresh_token: "local" }

  const channel = {
    on() { return channel },
    subscribe() { return channel },
    unsubscribe() { return Promise.resolve("ok") },
  }

  // storage จำลอง: เก็บเป็น data URL ในหน่วยความจำ (หายเมื่อรีสตาร์ท server)
  const store = ((globalThis as Record<string, unknown>).__localStorageFiles ??= new Map<string, string>()) as Map<string, string>

  return {
    from: (table: string) => new LocalQuery(table, exec),
    rpc: () => Promise.resolve({ data: null, error: { message: "rpc ไม่รองรับใน local mode" } }),
    channel: () => channel,
    removeChannel: () => Promise.resolve("ok"),
    storage: {
      from: () => ({
        async upload(path: string, file: Blob) {
          const buf = Buffer.from(await file.arrayBuffer())
          store.set(path, `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`)
          return { data: { path }, error: null }
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: store.get(path) ?? "" }, error: null }
        },
        remove: () => ok([]),
      }),
    },
    auth: {
      getUser: () => ok({ user: LOCAL_USER }),
      getSession: () => ok({ session }),
      onAuthStateChange: (cb: AuthCallback) => {
        setTimeout(() => cb("INITIAL_SESSION", session), 0)
        return { data: { subscription: { unsubscribe() {} } } }
      },
      signInAnonymously: () => ok({ user: LOCAL_USER, session }),
      signInWithPassword: () => ok({ user: LOCAL_USER, session }),
      signInWithOAuth: () => ok({ provider: "google", url: "/" }),
      signUp: () => ok({ user: LOCAL_USER, session }),
      signOut: () => Promise.resolve({ error: null }),
      linkIdentity: () => ok({}),
      updateUser: () => ok({ user: LOCAL_USER }),
      resetPasswordForEmail: () => ok({}),
      exchangeCodeForSession: () => ok({ session }),
      admin: { deleteUser: () => Promise.resolve({ error: null }) },
    },
  }
}
