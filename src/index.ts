#!/usr/bin/env node

import * as dotenv from 'dotenv'

dotenv.config()


import Chalk from 'chalk'
import figlet from 'figlet'
// import path from 'path'
import { Command } from 'commander'
import { Dropbox } from 'dropbox'

console.log(
  Chalk.greenBright(
    figlet.textSync('drop-drop-box', { horizontalLayout: 'full' })
  )
);
const command = new Command('drop-drop-box')
command
  .description("An example CLI for ordering pizza's")
  // .option('-p, --peppers', 'Add peppers')
  // .option('-c, --cheese <type>', 'Add the specified type of cheese [marble]')
  // .option('-C, --no-cheese', 'You do not want any cheese')
  .parse(process.argv);

// if (!process.argv.slice(2).length) {
//   command.outputHelp();
// }

const dbx = new Dropbox({
                        accessToken:  process.env.DROPBOX_ACCESS_TOKEN,
                        clientId:     'slekh6hf9rwmb1v',
                        clientSecret: 'l1cu6kkz3dcevqw'
                      });
dbx.filesListFolder({ path: '' })
   .then(function (response) {

     console.log(response.result);
     console.log(response.result.entries.filter(f => f['.tag'] === 'file').map(f => f.name));
   })
   .catch(function (error) {
     console.error(error);
   })

