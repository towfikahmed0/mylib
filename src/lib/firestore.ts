export function sanitizeFirestoreData<T>(data: T): T {
  const sanitize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => (item === undefined ? null : sanitize(item)))
    }

    if (value === null || typeof value !== 'object') return value

    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return value

    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) =>
        item === undefined ? [] : [[key, sanitize(item)]],
      ),
    )
  }

  return sanitize(data) as T
}