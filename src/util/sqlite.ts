import {Database} from "sqlite-async";

export async function tableHasColumn(db: Database, table: string, column: string) {
  return !!(await db.get<{
    ['COUNT(*)']: number
  }>(`
  SELECT COUNT(*)
  FROM pragma_table_info('${table}')
  WHERE name='${column}'`))['COUNT(*)'];
}
