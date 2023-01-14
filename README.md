# Migrate out of Dropbox

It's a command line tool that lets you increntally migrate away from Dropbox, and move my photos into Google Photos.

The idea is there are commands to:
- add a Dropbox folder
- discover photos within Dropbox
- move photos over to google photos

The first two steps builds a queues of Dropbox folders and Dropbox items, respectively.


## Usage (not done)
```
$ ts-node src/index.ts  help
      _                                      _                                  _                    
   __| |  _ __    ___    _ __             __| |  _ __    ___    _ __           | |__     ___   __  __
  / _` | | '__|  / _ \  | '_ \   _____   / _` | | '__|  / _ \  | '_ \   _____  | '_ \   / _ \  \ \/ /
 | (_| | | |    | (_) | | |_) | |_____| | (_| | | |    | (_) | | |_) | |_____| | |_) | | (_) |  >  < 
  \__,_| |_|     \___/  | .__/           \__,_| |_|     \___/  | .__/          |_.__/   \___/  /_/\_\
                        |_|                                    |_|                                   
Usage: drop-drop-box [options] [command]

CLI for transferring files from Dropbox to Google Photos

Options:
  -db, --database <db>  SQLLite3 database path (default: "./dropbox-db.sqlite3")
  -V, --verbose         Lotsa logging (default: false)
  -h, --help            display help for command

Commands:
  status                show current status
  add <paths...>        add DropBox path to search for images
  discover [n]          discover new Dropbox files in added folders
  folders               show Dropbox folders
  reset-auth            reset the persisted auth and log in again
  google                google stuff
  help [command]        display help for command
```

## Technical Decisions

Typescript
Use Sqlite for the database.
Incremental/Restartable actions
Visibility into what's happening.

## Code sources

- I manually applied this [Template](https://itnext.io/how-to-create-your-own-typescript-cli-with-node-js-1faf7095ef89)
- I copied some of the google oauth implementation from https://github.com/buttercup/google-oauth2-client. It was the first one I could get to work. I am taking it in a different direction, but that code got me started. Also of interest: https://dev.to/lauravuo/how-to-oauth-from-the-command-line-47j0 https://github.com/badgateway/oauth2-client

## Tasks

- [ ] Dropbox oauth
- [ ] Filter out images that can be processed
- [ ] Keep a list of non-images... what to do?
- [ ] Mark as copied on Dropbox, or remove
- [ ] import into folder on Google Photos
- https://github.com/red-data-tools/YouPlot



## Questions
- [ ] make sure creationTime is accurately set
- [ ] filter by type
- [ ] other metadata?




Flow:
- Dropbox: add folders to list of folders to traverse
- Dropbox: traverse folder and enqueue photos
- Dropbox: download an item, 
- Google upload, remember google upload token
- Google: Use "batch:create" to add to photos account and album
