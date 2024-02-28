
const { ApiPromise, WsProvider } = require('@polkadot/api')
const fs = require("fs");
const yargs = require("yargs");
const Chart = require("chart.js/auto")
const canv = require("canvas");


const filename = "output.txt";
const documentName = "graph.html"
const decimals = 10e17;

// TODO (opis)
const keyBlockNumbers = [4932602, 5119443, 5514934]


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

  // TODO
  var startBlockNum = parseInt(args.beginBlockNum);
  const end = parseInt(args.endBlockNum);
  const str = parseInt(args.stride);

  var blockIssuanceDic = {};

  // Fetch all block hashes
  console.info(`Fetching block hashes...`)
  var blockHashesPromises = [];
  var i = startBlockNum;
  for (; i <= end; i += str) {
    blockHashesPromises.push(api.rpc.chain.getBlockHash(i));
  }
  // Make sure the ending block is included (in case ending block is skipped due to stride)
  if (i < end + str) {
    blockHashesPromises.push(api.rpc.chain.getBlockHash(end));
  }
  const blockHashes = await Promise.all(blockHashesPromises);

  // Fetch all api at specific block hashes
  console.info(`Fetching specific block api...`)
  var apiAtCurrentBlockPromises = [];
  for (var i = 0; i < blockHashes.length; i++) {
    apiAtCurrentBlockPromises.push(api.at(blockHashes[i]));
  }
  const apiAtCurrentBlock = await Promise.all(apiAtCurrentBlockPromises);


  // Fetch issuance at specific blocks
  console.info(`Fetching issuance for specific block...`);
  var currentBlockIssuancePromises = [];
  for (var i = 0; i < apiAtCurrentBlock.length; i++) {
    currentBlockIssuancePromises.push(apiAtCurrentBlock[i].query.balances.totalIssuance());
  }
  const currentBlockIssuance = await Promise.all(currentBlockIssuancePromises.map(async (promise) => {
    const issuance = await promise;
    return Math.floor(issuance / decimals);
  }));


  for (var i = 0; i < currentBlockIssuance.length; i++) {
    //console.log(`Block number: ${currentBlockNum + (i * str)}    Issuance: ${currentBlockIssuance[i]}`);
    blockIssuanceDic[startBlockNum + (i * str)] = currentBlockIssuance[i];
  }

  var keyBlockPoints = [];
  keyBlockPoints.push({ x: `${startBlockNum}`, y: currentBlockIssuance[0] });
  for (var i = 0; i < keyBlockNumbers.length; i++) {
    console.log(`Checking block number  ${keyBlockNumbers[i]}`);
    if (keyBlockNumbers[i] < startBlockNum || keyBlockNumbers[i] > end) break;

    const keyBlockHash = await api.rpc.chain.getBlockHash(keyBlockNumbers[i]);
    const apiAtCurrentKeyBlock = await api.at(keyBlockHash);
    const issuanceAtKeyBlock = Math.floor((await apiAtCurrentKeyBlock.query.balances.totalIssuance()) / decimals);

    console.log(`Block number: ${keyBlockNumbers[i]}   Issuance: ${issuanceAtKeyBlock}`);

    keyBlockPoints.push({ x: `${keyBlockNumbers[i]}`, y: issuanceAtKeyBlock });
    blockIssuanceDic[parseInt(keyBlockNumbers[i])] = issuanceAtKeyBlock;
  }

  keyBlockPoints.push({ x: `${startBlockNum + str * (blockHashes.length - 1)}`, y: currentBlockIssuance[currentBlockIssuance.length - 1] });

  fs.writeFileSync(filename, JSON.stringify(blockIssuanceDic));

  return [blockIssuanceDic, keyBlockPoints];
}

/**
 * TODO
 * @param {*} data 
 */
function createGraphHTML(data, keyPointData) {

  const labels = Object.keys(data);
  const datapoints = Object.values(data);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: datapoints,
        fill: false,
        borderDash: [5, 5],
        fill: false
      }, {
        data: keyPointData,
        fill: true,
      }
    ]
  }

  const chartConfig = {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Astar Token Issuance'
        },
        legend: {
          display: false
        },
        interaction: {
          intersect: false
        }
      },
      elements: {
        point: {
          radius: 0
        }
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      hover: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: 'Block Number'
          }
        },
        y: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: 'Issued Tokens'
          }
        }
      }
    },
  };

  const canvas = canv.createCanvas(1000, 800);
  const ctx = canvas.getContext('2d');

  console.info(`Chart config contents: \n ${JSON.stringify(chartConfig)}`);

  const contents = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport", initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <title>Astar Issuance Graph</title>
        <style>
          body, html {
            margin: 0 auto;
            padding: 0 auto;
            width: 95%;
            height: 95%;
          }
          canvas {
            display: block;
            margin: 0 auto;
            width: 95vw;
            height: 95vw;
          }
        </style>
    </head>
    <body>
        <div>
          <canvas id="myChart"></canvas>
        </div>
        <script>
            var ctx = document.getElementById('myChart').getContext('2d');
            var myChart = new Chart(ctx, ${JSON.stringify(chartConfig)});
        </script>
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
  [t, keyPoints] = await fetchIssuancePerBlock(args);
  const data = JSON.parse(fs.readFileSync(filename));

  console.log(data, keyPoints)

  /*
  for (const [num, issuance] of Object.entries(data)) {
    console.log(`Block number: ${num}   Issuance: ${issuance}`);
  }
  */

  createGraphHTML(data, keyPoints);

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
