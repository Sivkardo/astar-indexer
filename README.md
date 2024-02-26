## Prepare
 * Install dependencies using `npm install` or `yarn install`
 * Run `yarn start --help` for detailed info 

## How To Use?
Parameters to use:
  * `-e`: endpoint connection
  * `--beg`: beggining block number
  * `--end`: ending block number
  * `-s`: stride between blocks

## Example
  `yarn start -e wss://rpc.astar.network --beg 3930000 --end 5600000 -s 250000 draw`
  After running the previous command, open the `graph.html`
