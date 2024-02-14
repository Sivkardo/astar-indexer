
const { ApiPromise, WsProvider } = require('@polkadot/api')

const fs = require("fs");

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
async function fetchIssuancePerBlock(api, beginBlockNum, endBlockNum, stride) {

  var currentBlockNum = beginBlockNum;

  var blockIssuanceDic = {};

  while(currentBlockNum <= endBlockNum) {

    // Fetch hash of current block
    const currentBlockHash = await api.rpc.chain.getBlockHash(currentBlockNum);
    
    // Fetch api for current block, allows us to fetch the issuance of current block
    const apiAtCurrentBlock = await api.at(currentBlockHash);

    // Fetches the issuance of current block
    const currentBlockIssuance = Math.floor((await api.query.balances.totalIssuance()) / decimals);

    console.info(`Current block number: ${currentBlockNum}`);
    console.info(`Current block hash: ${currentBlockHash}`);
    console.info(`Issuance of current block: ${currentBlockIssuance}\n`);

    blockIssuanceDic[currentBlockNum] = currentBlockIssuance;

    currentBlockNum += stride;
  }

  fs.writeFileSync(filename, JSON.stringify(blockIssuanceDic));

  return blockIssuanceDic;
}

/**
 * 
 */
function drawGraph(filename) {

    const data = JSON.parse(fs.readFileSync(filename));

    console.log(data);

}


const main = async function () {
    const endpoint = 'wss://rpc.astar.network';
    const api = await connectApi(endpoint);

    await fetchIssuancePerBlock(api, 4933602, 4947444, 800);
    drawGraph(filename);

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
