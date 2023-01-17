import {Dropbox, files} from 'dropbox'
import fetch from "node-fetch";
import {MimeType} from "./google-photos_api";
import FileMetadataReference = files.FileMetadataReference;
import {TokenStore} from "./oauth2-client/TokenStore";
import {OAuth2Client} from "./oauth2-client";
import {ProviderUrlsSupported} from "./oauth2-client/ProviderUrlsSupported";
import {obtainBearerToken} from "./oauth2-client/obtainBearerToken";

export type DropboxFileImport = Pick<files.FileMetadataReference, ".tag" | "id" | "size" | "media_info" | "export_info" | "property_groups" | "has_explicit_shared_members" | "content_hash" | "file_lock_info" | "name" | "path_lower" | "preview_url">

let dropboxApi: Dropbox;

// Returns Access token
export async function oauthDropbox({
                                     clientId,
                                     clientSecret,
                                     tokenStore
                                   }: {
  clientId: string,
  clientSecret: string,
  tokenStore: TokenStore
}): Promise<void> {

  const client = new OAuth2Client({
      clientId,
      clientSecret,
      tokenStore,
      redirectUrl: `http://localhost:9998/callback`,
      providerUrls: ProviderUrlsSupported.Dropbox
    }
  );

  const accessToken = await obtainBearerToken({client, scope: '', verbose: true});

  // Set up the `dropboxApi` global
  dropboxApi = new Dropbox({
    accessToken,
    clientId: clientId,
    clientSecret: clientSecret
  });
}


export async function listFolderResult(path: string, cursor: string | null) {
  // console.log('listFolderResult for ', path, JSON.stringify(dropbox))

  const response = cursor !== null
    ? await dropboxApi.filesListFolderContinue({cursor: cursor})
    : await dropboxApi.filesListFolder({
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

  const {result} = await dropboxApi.filesDownload({path})
  const stream = (result as unknown as { fileBinary: NodeJS.ReadableStream }).fileBinary
  return {stream, mimeType: pathToMimeType(path)}
}

// See https://api.dropboxapi.com/2/files/move_v2
export async function markTransferredOnDropbox(from_path: string) {
  const response = await dropboxApi.filesMoveV2({
    from_path,
    to_path: `/Migrated${from_path}`,
    allow_shared_folder: true
  })
  return response.result
}