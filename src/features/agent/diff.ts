export type DiffRow = {
  type: "same" | "add" | "remove";
  before?: string;
  after?: string;
};

export function diffLines(before: string, after: string): DiffRow[] {
  const left = before ? before.split("\n") : [];
  const right = after ? after.split("\n") : [];

  if (left.length * right.length > 40_000) {
    let prefix = 0;
    while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1;
    let suffix = 0;
    while (
      suffix < left.length - prefix
      && suffix < right.length - prefix
      && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
    ) suffix += 1;
    return [
      ...left.slice(0, prefix).map((line) => ({ type: "same" as const, before: line, after: line })),
      ...left.slice(prefix, left.length - suffix).map((line) => ({ type: "remove" as const, before: line })),
      ...right.slice(prefix, right.length - suffix).map((line) => ({ type: "add" as const, after: line })),
      ...left.slice(left.length - suffix).map((line) => ({ type: "same" as const, before: line, after: line })),
    ];
  }
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({ type: "same", before: left[i], after: right[j] });
      i += 1;
      j += 1;
    } else if (j < right.length && (i === left.length || matrix[i][j + 1] >= matrix[i + 1][j])) {
      rows.push({ type: "add", after: right[j] });
      j += 1;
    } else {
      rows.push({ type: "remove", before: left[i] });
      i += 1;
    }
  }
  return rows;
}
