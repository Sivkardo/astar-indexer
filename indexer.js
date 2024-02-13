
const { ApiPromise, WsProvider } = require('@polkadot/api')

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

  // TODO
  // NAME IT BETTER
  var dictionary = {};

  while(currentBlockNum <= endBlockNum) {

    // Fetch hash of current block
    const currentBlockHash = await api.rpc.chain.getBlockHash(currentBlockNum);

    // Fetch api for current block, allows us to fetch the issuance of current block
    const apiAtCurrentBlock = await api.at(currentBlockHash);

    // Fetches the issuance of current block
    const currentBlockIssuance = await api.query.balances.totalIssuance();

    // Save block number and corresponding issuance into a map (???)
    // Save it into a JSON file (???)
    // TODO
    dictionary[currentBlockNum] = currentBlockIssuance;

    currentBlockNum += stride;
  }

  return dictionary;
}


const main = async function () {
    const endpoint = 'wss://rpc.astar.network';
    const api = await connectApi(endpoint);

    //const blockNum = 4932602;

    const res = await fetchIssuancePerBlock(api, 4932602, 4934444, 100);

    console.log(`Dictionary => ${Object.values(res)}`);

  /*
    const [block] = await Promise.all([
        api.rpc.chain.getBlockHash(blockNum)
    ]);

    const actualTotal = await api.query.balances.totalIssuance();

    const apiAt = await api.at(block);
    const specificTotal = await apiAt.query.balances.totalIssuance();

    const diff = actualTotal - specificTotal;


    console.log(`Total issuance: ${actualTotal}`);
    console.log(`Issuance at block ${blockNum} => ${specificTotal}`)
    console.log(`Issued after block ${blockNum} => ${diff}`);
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
