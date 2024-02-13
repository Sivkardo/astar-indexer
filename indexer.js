
const { ApiPromise, WsProvider } = require('@polkadot/api')


async function connectApi(endpoint) {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({ provider: wsProvider });
  
    return api;
  };


const main = async function () {
    const endpoint = 'wss://rpc.astar.network';
    const api = await connectApi(endpoint);

    const blockNum = 4932602;

    const [block] = await Promise.all([
        api.rpc.chain.getBlockHash(blockNum)
    ])

    const actualTotal = await api.query.balances.totalIssuance();

    const apiAt = await api.at(block);
    const specificTotal = await apiAt.query.balances.totalIssuance();

    const diff = actualTotal - specificTotal;


    console.log(`Total issuance: ${actualTotal}`);
    console.log(`Issuance at block ${blockNum} => ${specificTotal}`)
    console.log(`Issued after block ${blockNum} => ${diff}`);


}

main()
  .then(() => {
    console.info('Exiting ...');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
