
const { ApiPromise, WsProvider } = require('@polkadot/api')
const fs = require("fs");
const yargs = require("yargs");
const can = require("canvas");

const filename = "output.txt";
const documentName = "graph.html"
const decimals = 10e17;



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

    /*
    console.info(`Current block number: ${currentBlockNum}`);
    console.info(`Current block hash: ${currentBlockHash}`);
    console.info(`Issuance of current block: ${currentBlockIssuance}\n`);
    */

    blockIssuanceDic[currentBlockNum] = currentBlockIssuance;

    currentBlockNum += str;
    console.info(`Next block num: ${currentBlockNum}`);
  }

  fs.writeFileSync(filename, JSON.stringify(blockIssuanceDic));

  return blockIssuanceDic;
}

/**
 * TODO
 */
function createGraphHTML(data) {

  // TODO
  // everything
  const canvas = can.createCanvas(1200, 800);
  const context = canvas.getContext('2d');

  const GRAPH_TOP = 60;
  const GRAPH_BOTTOM = 740;
  const GRAPH_LEFT = 60;
  const GRAPH_RIGHT = 1240;

  const GRAPH_HEIGHT = 680;
  const GRAPH_WIDTH = 1180;

  // Draw X and Y axis
  context.beginPath();
  context.moveTo(GRAPH_LEFT, GRAPH_TOP);
  context.lineTo(GRAPH_LEFT, GRAPH_BOTTOM);
  context.lineTo(GRAPH_RIGHT, GRAPH_BOTTOM);
  context.stroke();

  


  // Serialize the canvas to a data URL
  const dataUrl = canvas.toDataURL();

  const contents = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Astar Issuance Graph</title>
    </head>
    <body>
        <h1>Graph yes yes!</h1>
        <img src="${dataUrl}" alt="Canvas Image">
    </body>
    </html>
  `;

  fs.writeFileSync(documentName, contents);
}

/**
 * TODO
 */
async function drawGraph(args) {

    // TODO
    // error handling
    await fetchIssuancePerBlock(args);
    const data = JSON.parse(fs.readFileSync(filename));

    console.log(data)
    
    /*
    for (const [num, issuance] of Object.entries(data)) {
      console.log(`Block number: ${num}   Issuance: ${issuance}`);
    }
    */

    createGraphHTML();

    // TODO
    // open HTML file
}


async function main() {

    await yargs
      .options({
        endpoint: {
            alias: "e",
            default: "wss://rpc.astar.network",
            description: "WSS endpoint",
            string: true,
            global: true
        },
        beginBlockNum: {
            alias: "beg",
            default: "4932602",
            description: "Number of the first block",
            string: false,
            gobal: true
        },
        endBlockNum: {
          alias: "end",
          default: "5119443",
          description: "Number of the last block",
          string: false,
          gobal: true
        },
        stride: {
          alias: "s",
          default: "1000",
          description: "Size of stride between checked blocks",
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
