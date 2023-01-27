export type MimeType = 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'application/face'
  | 'application/octet-stream'

export function pathToMimeType(path: string): MimeType {
  if (path.match(/IMG.*\d+_face\d+\.jpe?g$/i))
    return 'application/face'
  if (path.match(/jpe?g$/i))
    return 'image/jpeg'
  if (path.match(/gif$/i))
    return 'image/gif'
  if (path.match(/png$/i))
    return 'image/png'
  return 'application/octet-stream'
}
