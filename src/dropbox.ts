import {Dropbox, files} from 'dropbox'
import fetch from "node-fetch";
import {MimeType} from "./google-photos";
import FileMetadataReference = files.FileMetadataReference;
import MediaInfoMetadata = files.MediaInfoMetadata;

export type DropboxFileImport = Pick<files.FileMetadataReference, ".tag" | "id" | "size" | "media_info" | "export_info" | "property_groups" | "has_explicit_shared_members" | "content_hash" | "file_lock_info" | "name" | "path_lower" | "preview_url">

let dropbox: Dropbox;

export function setUpDropboxApi() {
  dropbox = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    clientId: 'slekh6hf9rwmb1v',
    clientSecret: 'l1cu6kkz3dcevqw'
  });
}


export async function listFolderResult(path: string, cursor: string | null) {
  // console.log('listFolderResult for ', path, JSON.stringify(dropbox))

  const response = cursor !== null
    ? await dropbox.filesListFolderContinue({cursor: cursor})
    : await dropbox.filesListFolder({
      path,
      recursive: true,
      include_non_downloadable_files: false
    })
  return response.result
}

export function selectFilesFromResult(result: files.ListFolderResult): Array<DropboxFileImport> {
  return (
    result
      .entries
      .filter(f => f['.tag'] === 'file') as FileMetadataReference[])
    .filter(f => f.is_downloadable)
    .map(({
            client_modified,
            is_downloadable,
            path_display,
            parent_shared_folder_id,
            rev,
            server_modified,
            sharing_info,
            symlink_info,
            ...rest
          }) => rest)
}

function pathToMimeType(path: string): MimeType {
  if (path.match(/jpe?g$/i))
    return 'image/jpeg'
  if (path.match(/gif$/i))
    return 'image/gif'
  if (path.match(/png$/i))
    return 'image/png'
  throw `Unknown mime type for file ${path}`
}

export async function getStream(path: string):
  Promise<{ stream: NodeJS.ReadableStream, mimeType: MimeType }> {


  const {result} = await dropbox.filesDownload({path})
  const stream = (result as unknown as { fileBinary: NodeJS.ReadableStream }).fileBinary
  return {stream, mimeType: pathToMimeType(path)}


  const r1 = await dropbox.filesGetTemporaryLink({path});
  console.log(JSON.stringify({dropboxResponse: r1}))

  dropbox.filesTagsAdd({path, tag_text: 'downloading'})

  const r2 = await fetch(r1.result.link)
  await r2.blob()
  console.log('status', r2.status, r2.statusText)
  console.log('heders', JSON.stringify(r2.headers.get('mime-type')))
  console.log('repsonse', JSON.stringify(r2))
  // return {stream: r2.body, mediaInfo: r1.result.metadata.media_info as MediaInfoMetadata}
}


function filesMoveV2() {
  // dropbox.filesMoveV2({from_path, to_path,})
}

/*

  response: DropboxResponse {
    status: 200,
    headers: Headers { [Symbol(map)]: [Object: null prototype] },
    result: {
      entries: [Array],
      cursor: 'AAGuyC5BUmpLoWfKCZy4mD4etRTa7i9jp2fA7i8gyf6y0F55IIJHt1Ic3ec3Bx5ariumhfCEO6JVxX1f_XwAo385Xf3nPpevoxZsJulZfTn3sh_veU-GcoBU7afboG9a5aEPi2P7fRL52dTojzEY9y_76vjJbuv7x-f1S6rt0TomVihiIEeXmM6wHeLcBj9Ci00Tg-FRgDpuCIARYl4XoYP6oMJa9RHx61vm04t6fzydKIVoh2FyEncBoQd_TgeO3cIInFb0U-honB2oOR85h9JGituVthpb3EA0_zjki4yerg',
      has_more: false
    }
  }

 */
