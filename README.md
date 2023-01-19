# Migrate out of Dropbox

It's a command line tool that lets you incrementally migrate photos away from Dropbox, 
and move my photos into Google Photos.

This is a command line tool with several subcommands so that you can orchestra
the migration a fine or bulky as you want:
- add a Dropbox folder to be migrated
- discover photos within Dropbox folders
- move photos over to google photos

After the photos are moved to Google photos, they are moved to a folder on Dropbox so 
they can be manually deleted (if you want).

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

CLI for transferring images from Dropbox to Google Photos

Options:
  -db, --database <db>         SQLLite3 database path (default: "./dropbox-db.sqlite3")
  -h, --help                   display help for command

Commands:
  stats                        Show current DB stats and queue lengths
  folders                      Show Dropbox folders queued for migration
  login [google|dropbox|all]   Log in
  logout [google|dropbox|all]  Reset the persisted auth
  add <paths...>               Enqueue DropBox path to search for images (recursively)
  discover [n]                 Discover new Dropbox files in queued folders
  album <name>                 Create new album on Google photos and migrate all future images to this album
  transfer [n]                 Transfer queued Dropbox items to Google Photos
  help [command]               display help for command
```

## TODOs

- [x] Dropbox oauth
- [x] Dropbox oauth refresh token
- [ ] OAUTH add scope to store / incremental authorization
- [ ] Filter out images that can be processed
- [ ] Keep a list of non-images... what to do?
- [x] report album name
- [ ] ability to set and see dropbox archive folder-- or NO folder for no movement
- [x] Mark as copied on Dropbox, or remove
- [x] import into folder on Google Photos
- [ ] http://www.graphicsmagick.org/identify.html
- [x] https://github.com/IonicaBizau/image-to-ascii
- [ ] https://github.com/red-data-tools/YouPlot


## Questions
- [x] make sure creationTime is accurately set. seems to be
- [ ] is other metadata being lost?


## Code sources

- I manually applied this [Template](https://itnext.io/how-to-create-your-own-typescript-cli-with-node-js-1faf7095ef89)
- I copied some of the google oauth implementation from https://github.com/buttercup/google-oauth2-client. It was the first one I could get to work. I am taking it in a different direction, but that code got me started. Also of interest: https://dev.to/lauravuo/how-to-oauth-from-the-command-line-47j0 https://github.com/badgateway/oauth2-client




