// blend.ts — แปลง "ความต้องการธาตุอาหาร (N/P2O5/K2O)" เป็น "ต้องใช้ปุ๋ยแต่ละสูตรกี่กิโล"
//
// โจทย์: มีปุ๋ย m สูตร (m = 1..3) แต่ละสูตรมี %N, %P2O5, %K2O
//        หาปริมาณ x (กก.) ของแต่ละสูตร ให้ธาตุที่ได้ใกล้เป้าหมายที่สุด โดย x >= 0
//
// วิธี: least squares แบบมีเงื่อนไข x >= 0 (NNLS)
//       เนื่องจาก m <= 3 จึงไล่ทุก subset ของสูตรที่เลือก (สูงสุด 7 แบบ)
//       แต่ละ subset แก้สมการปกติ (normal equations) แล้วเก็บคำตอบที่ไม่ติดลบและ residual ต่ำสุด
//       -> ได้คำตอบที่ถูกต้องแน่นอนสำหรับปัญหาขนาดเล็ก และไม่มีทางได้ปุ๋ยติดลบ

export interface Formula {
  id: string
  name: string
  grade?: string | null
  n: number // %N
  p2o5: number // %P2O5
  k2o: number // %K2O
}

export interface Nutrients {
  n: number
  p2o5: number
  k2o: number
}

export interface BlendItem {
  formula: Formula
  kg: number
}

export interface BlendResult {
  items: BlendItem[] // เฉพาะสูตรที่ต้องใช้ (kg > 0)
  target: Nutrients
  supplied: Nutrients // ธาตุที่ได้จริงจากปุ๋ยที่แนะนำ
  diff: Nutrients // supplied - target (บวก = เกิน, ลบ = ขาด)
  exact: boolean // ตรงเป้าทุกธาตุ (คลาดเคลื่อน < 1%)
}

const EPS = 1e-9

// แก้ระบบสมการ A x = b (A ขนาด n×n) ด้วย Gaussian elimination + partial pivoting
// คืน null ถ้า singular (แก้ไม่ได้)
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    }
    if (Math.abs(M[piv][col]) < EPS) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col] / M[col][col]
      if (f === 0) continue
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]
    }
  }
  // หลัง Gauss-Jordan เมทริกซ์เป็นแนวทแยง -> x_i = M[i][n] / M[i][i]
  return M.map((row, i) => row[n] / row[i])
}

// ธาตุที่ได้จากปุ๋ย x กก. ของสูตร f
function supply(f: Formula, kg: number): Nutrients {
  return {
    n: (f.n / 100) * kg,
    p2o5: (f.p2o5 / 100) * kg,
    k2o: (f.k2o / 100) * kg,
  }
}

function sumSupply(items: BlendItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, it) => {
      const s = supply(it.formula, it.kg)
      return { n: acc.n + s.n, p2o5: acc.p2o5 + s.p2o5, k2o: acc.k2o + s.k2o }
    },
    { n: 0, p2o5: 0, k2o: 0 }
  )
}

/**
 * คำนวณว่าต้องใช้ปุ๋ยแต่ละสูตรกี่กิโล เพื่อให้ได้ธาตุอาหารใกล้เป้าหมายที่สุด
 * @param target ธาตุอาหารที่ต้องการ (กก.) — หน่วยเดียวกับผลลัพธ์ (เช่น กก./ไร่ หรือ กก./ต้น)
 * @param formulas ปุ๋ยที่ผู้ใช้เลือก (1-3 สูตร)
 */
export function blendFertilizer(
  target: Nutrients,
  formulas: Formula[]
): BlendResult {
  const usable = formulas.filter(
    (f) => f.n > 0 || f.p2o5 > 0 || f.k2o > 0
  )
  const b = [target.n, target.p2o5, target.k2o]

  let best: { items: BlendItem[]; residual: number } | null = null

  // ไล่ทุก subset (ไม่ว่าง) ของสูตรที่เลือก
  const total = 1 << usable.length
  for (let mask = 1; mask < total; mask++) {
    const subset = usable.filter((_, i) => mask & (1 << i))
    const m = subset.length

    // A คือเมทริกซ์ 3×m (แถว = ธาตุ, คอลัมน์ = สูตร), หน่วยสัดส่วน (0-1)
    const A: number[][] = [
      subset.map((f) => f.n / 100),
      subset.map((f) => f.p2o5 / 100),
      subset.map((f) => f.k2o / 100),
    ]

    // normal equations: (AᵀA) x = Aᵀb  -> ขนาด m×m
    const AtA: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: m }, (_, j) =>
        A.reduce((s, row) => s + row[i] * row[j], 0)
      )
    )
    const Atb: number[] = Array.from({ length: m }, (_, i) =>
      A.reduce((s, row, r) => s + row[i] * b[r], 0)
    )

    const x = solveLinear(AtA, Atb)
    if (!x) continue
    if (x.some((v) => v < -1e-6 || !Number.isFinite(v))) continue // ติดลบ = ใช้ไม่ได้

    const items: BlendItem[] = subset
      .map((f, i) => ({ formula: f, kg: Math.max(0, x[i]) }))
      .filter((it) => it.kg > 1e-6)

    const sup = sumSupply(items)
    const residual =
      (sup.n - target.n) ** 2 +
      (sup.p2o5 - target.p2o5) ** 2 +
      (sup.k2o - target.k2o) ** 2

    // เลือก residual ต่ำสุด; ถ้าเท่ากันเลือกที่ใช้ปุ๋ยน้อยชนิดกว่า
    if (
      !best ||
      residual < best.residual - 1e-9 ||
      (Math.abs(residual - best.residual) <= 1e-9 &&
        items.length < best.items.length)
    ) {
      best = { items, residual }
    }
  }

  const items = best?.items ?? []
  const supplied = sumSupply(items)
  const diff = {
    n: supplied.n - target.n,
    p2o5: supplied.p2o5 - target.p2o5,
    k2o: supplied.k2o - target.k2o,
  }

  const within = (got: number, want: number) =>
    want <= 0 ? Math.abs(got) < 1e-6 : Math.abs(got - want) / want < 0.01

  return {
    items,
    target,
    supplied,
    diff,
    exact:
      within(supplied.n, target.n) &&
      within(supplied.p2o5, target.p2o5) &&
      within(supplied.k2o, target.k2o),
  }
}
