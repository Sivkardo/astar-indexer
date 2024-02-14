
const { ApiPromise, WsProvider } = require('@polkadot/api')

const fs = require("fs");
const yargs = require("yargs");

const filename = "output.txt";
const decimals = 10e17;


// TODO
// ##### ADD YARGS #### 

/**
 * TODO
 * @param {*} endpoint 
 * @returns 
 */
async function connectApi(endpoint) {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({ provider: wsProvider });
  
    return api;
}

/**
 * TODO
 * @param {*} api 
 * @param {*} beginBlockNum 
 * @param {*} endBlockNum 
 * @param {*} stride 
 * @returns 
 */
async function fetchIssuancePerBlock(args) {

  console.info(`Inside fetch`);

  const api = await connectApi(args.endpoint);
  var currentBlockNum = parseInt(args.beginBlockNum);
  var blockIssuanceDic = {};

  const end = parseInt(args.endBlockNum);
  const str = parseInt(args.stride);

  while(currentBlockNum <= end) {

    // Fetch hash of current block
    const currentBlockHash = await api.rpc.chain.getBlockHash(currentBlockNum);
    
    // Fetch api for current block, allows us to fetch the issuance of current block
    const apiAtCurrentBlock = await api.at(currentBlockHash);

    // Fetches the issuance of current block
    const currentBlockIssuance = Math.floor((await apiAtCurrentBlock.query.balances.totalIssuance()) / decimals);

    console.info(`Current block number: ${currentBlockNum}`);
    console.info(`Current block hash: ${currentBlockHash}`);
    console.info(`Issuance of current block: ${currentBlockIssuance}\n`);

    blockIssuanceDic[currentBlockNum] = currentBlockIssuance;

    currentBlockNum += str;
    console.info(`Next block num: ${currentBlockNum}`);
  }

  fs.writeFileSync(filename, JSON.stringify(blockIssuanceDic));

  return blockIssuanceDic;
}

/**
 * 
 */
async function drawGraph(args) {

    console.log(args)

    console.info(`Inside drawGraph`);

    // TODO
    // error handling
    await fetchIssuancePerBlock(args);
    const data = JSON.parse(fs.readFileSync(filename));

    console.log(data);

}


async function main() {

    //TODO
    // make drawGraph the default function
    // add descriptions
    await yargs
      .options({
        endpoint: {
            alias: 'e',
            default: 'wss://rpc.astar.network',
            string: true,
            global: true
        },
        beginBlockNum: {
            alias: 'beg',
            default: '4932602',
            string: false,
            gobal: true
        },
        endBlockNum: {
          alias: 'end',
          default: '5119443',
          string: false,
          gobal: true
        },
        stride: {
          alias: 's',
          default: '1000',
          string: false,
          gobal: true
        }
      })
      .command(
        ["draw"],
        "Draw",
        {},
        drawGraph
      )
      .parse();

      console.info(`Inside main`);

      drawGraph(yargs);
    /*
    const endpoint = 'wss://rpc.astar.network';
    const api = await connectApi(endpoint);

    await fetchIssuancePerBlock(api, 4933602, 4947444, 800);
    drawGraph(filename);
    */

};

main()
  .then(() => {
    console.info('Exiting ...');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
