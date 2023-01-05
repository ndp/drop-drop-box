export const lpad = (s: string, len: number): string => s.length < len ? lpad(' ' + s, len) : s;
