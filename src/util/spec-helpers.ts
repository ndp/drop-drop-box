export function rejectNTimesThenResolve<T, E>(n: number, result: T, error: E) {
  return () => n-- > 0
    ? Promise.reject(error)
    : Promise.resolve(result)
}

export function throwNTimesThenReturn<T, E>(n: number, result: T, e: E) {
  return () => {
    if (n-- > 0)
      throw e
    return result
  }
}

