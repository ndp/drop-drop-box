import {Dropbox, DropboxResponse, DropboxResponseError, files} from 'dropbox'
import FileMetadataReference = files.FileMetadataReference;
import {TokenStore} from "./oauth2-client/TokenStore";
import {OAuth2Client} from "./oauth2-client";
import {ProviderUrlsSupported} from "./oauth2-client/ProviderUrlsSupported";
import {obtainBearerToken} from "./oauth2-client/obtainBearerToken";
import {Buffer} from 'node:buffer';
import MediaInfoMetadata = files.MediaInfoMetadata;
import {MimeType, pathToMimeType} from "./util/mime-type";
import {makeRetryable} from "./util/makeRetryable";
import {isNetworkError, RetryableStatusCodesDefault} from "./util/fetchWithRetry";

export type DropboxFileImport = Pick<files.FileMetadataReference, ".tag" | "id" | "size" | "media_info" | "export_info" | "property_groups" | "has_explicit_shared_members" | "content_hash" | "file_lock_info" | "name" | "path_lower" | "preview_url">

let dropboxApi: Dropbox;

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

  // Set up the `dropboxApi` global, which bakes in the access token
  dropboxApi = new Dropbox({
    accessToken,
    clientId: clientId,
    clientSecret: clientSecret
  });

  dropboxApi.filesDownload = makeRetryable(dropboxApi.filesDownload, {
    async shouldRetry(count: number, e: DropboxResponse<files.FileMetadata>): Promise<boolean> {
      if (count >= 4) return false
      if (e.status === 401)
        await client.refreshAccessToken()
      return isNetworkError(e);
    },
    delay: 5000,
  })
  // TODO Re-auth
  dropboxApi.filesMoveV2 = makeRetryable(dropboxApi.filesMoveV2, {
    shouldRetry: async (count: number, e: DropboxResponseError<files.RelocationResult>): Promise<boolean> => {
      if (count >= 4) return false
      if (e.status === 401)
        await client.refreshAccessToken()
      return (isNetworkError(e) || RetryableStatusCodesDefault.includes(e.status))
    },
    delay: 5000,
  })
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

export async function downloadFile(path: string):
  Promise<{ buffer: Buffer, mimeType: MimeType, dimensions: { width: number, height: number } }> {

  const {result} = await dropboxApi.filesDownload({path})
  const buffer = (result as unknown as { fileBinary: Buffer }).fileBinary
  const mimeType = pathToMimeType(path);

  const mediaInfo = result.media_info as MediaInfoMetadata
  const dimensions = mediaInfo?.metadata.dimensions ?? {width: 0, height: 0}
  return {buffer, mimeType, dimensions}
}

/*

export async function getDownloadInfo(path: string):
  Promise<{ buffer: Buffer, mimeType: MimeType }> {

  const {result} = await dropboxApi.filesDownload({path})
  const buffer = (result as unknown as { fileBinary: Buffer }).fileBinary
  console.log({buffer, result})
  return {buffer, mimeType: pathToMimeType(path)}
}

 */

// See https://api.dropboxapi.com/2/files/move_v2
export async function markTransferredOnDropbox(from_path: string) {
  const response = await dropboxApi.filesMoveV2({
    from_path,
    to_path: `/Migrated${from_path}`,
    allow_shared_folder: true
  })
  return response.result
}
