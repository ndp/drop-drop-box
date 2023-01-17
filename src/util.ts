import {Database} from "../../sqlite-async";

export const lpad = (s: string, len: number): string => s.length < len ? lpad(' ' + s, len) : s;


type URLParams = Record<string, string | true>

/**
 * Extracted from ts-playground, wherein lie the tests. Modify it there..
 * - parameters alphabetized
 */
export function buildQueryString<Params extends URLParams>(
  params: Params = {} as Params
): string {
  return Object
    .keys(params)
    .sort()
    .map(k => `${k}${params[k] === true ? '' : `=${encodeURIComponent(params[k])}`}`)
    .join('&')
}

export async function tableHasColumn(db: Database, table: string, column: string) {
  return !!(await db.get<{
    ['COUNT(*)']: number
  }>(`
  SELECT COUNT(*)
  FROM pragma_table_info('${table}')
  WHERE name='${column}'`))['COUNT(*)'];
}

