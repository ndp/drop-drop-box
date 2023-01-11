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
