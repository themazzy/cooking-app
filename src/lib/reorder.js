// Moving ingredient rows, ingredient groups and steps around (the recipe editor's drag handles)

/** Runs of rows that share a group, in order: [{ group, start, end }]. */
export function sections(rows) {
  const out = []
  rows.forEach((r, n) => {
    const last = out[out.length - 1]
    if (last && last.group === (r.group ?? '')) last.end = n
    else out.push({ group: r.group ?? '', start: n, end: n })
  })
  return out
}

/** Moves one item to before index `to` (0..length, counted before the move). */
export function moveItem(list, from, to) {
  if (to === from || to === from + 1) return list
  const next = list.filter((_, k) => k !== from)
  next.splice(to > from ? to - 1 : to, 0, list[from])
  return next
}

/** Moves an ingredient row to before index `to`, into the group it lands in. */
export function moveRow(rows, from, to, group) {
  const next = rows.filter((_, k) => k !== from)
  next.splice(to > from ? to - 1 : to, 0, { ...rows[from], group })
  return next
}

/** Moves a whole group (rows start..end) to before index `to`. */
export function moveRun(rows, start, end, to) {
  if (to >= start && to <= end + 1) return rows
  const run = rows.slice(start, end + 1)
  const next = [...rows.slice(0, start), ...rows.slice(end + 1)]
  next.splice(to > end ? to - run.length : to, 0, ...run)
  return next
}

/**
 * Every place a row can be dropped: before each row and at the end of each
 * group, plus above the first heading (out of all groups) when the list
 * starts with a group. `at` says which element and edge marks the place.
 */
export function rowSlots(secs) {
  const slots = []
  if (secs[0]?.group) slots.push({ to: 0, group: '', at: ['section', 0, 'top'] })
  secs.forEach((s) => {
    for (let r = s.start; r <= s.end; r++) slots.push({ to: r, group: s.group, at: ['row', r, 'top'] })
    slots.push({ to: s.end + 1, group: s.group, at: ['row', s.end, 'bottom'] })
  })
  return slots
}

/** The slot one place up (-1) or down (1) from row n, or null at either end. */
export function rowStep(rows, n, by) {
  const slots = rowSlots(sections(rows))
  const group = rows[n].group ?? ''
  const here = slots.findIndex((s) => s.group === group && s.to === (by < 0 ? n : n + 1))
  return slots[here + by] ?? null
}

/**
 * Places a group can be dropped: before each section and at the end. A group
 * never goes above rows that have no group, since those have no heading.
 */
export function groupSlots(secs) {
  const slots = secs.map((s, k) => ({ to: s.start, at: ['section', k, 'top'] })).filter((_, k) => k > 0 || secs[0].group)
  if (secs.length) slots.push({ to: secs[secs.length - 1].end + 1, at: ['section', secs.length - 1, 'bottom'] })
  return slots
}
