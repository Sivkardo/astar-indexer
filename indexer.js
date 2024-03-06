
const { ApiPromise, WsProvider } = require('@polkadot/api')
const fs = require("fs");
const yargs = require("yargs");
const Chart = require("chart.js/auto")
const canv = require("canvas");

const filename = "output.txt";
const documentName = "graph.html"
const decimals = 10e17;
const initialIssuance = 7_000_000_000;
const blocksMinedPerDay = 7200;


const keyBlockData = {
  4932602: "New Fee System",
  5119443: "Hybrid Inflation",
  5514934: "Tokenomics 2.0- First Voting Subperiod",
  5594134: "Tokenomics 2.0 - Build & Earn Subperiod"
};


/**
 * 
 * Connects to the API
 * 
 * @param {*} endpoint - endpoint to connect to
 * @returns api
 */
async function connectApi(endpoint) {
  const wsProvider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider: wsProvider });

  return api;
}

/**
 *
 * Fetches issuance per specific block
 * 
 * @param {*} api - API it connects to fetch data
 * @param {*} beginBlockNum - number of starting block
 * @param {*} endBlockNum - number of ending block
 * @param {*} stride - steps between blocks
 * @returns 2 element array - dictionary(key - block number, value - issuance), key block points array
 */
async function fetchIssuancePerBlock(args) {

  const api = await connectApi(args.endpoint);

  const startBlockNum = parseInt(args.beginBlockNum);
  const end = parseInt(args.endBlockNum);
  const str = parseInt(args.stride);

  // Check if user inputed proper block number interval range
  if (startBlockNum >= end) {
    throw new Error("Starting block number must be smaller than ending block number!");
  }

  var blockIssuanceDic = {};

  // Fetch all block hashes
  console.info(`Fetching block hashes...`)
  var blockHashesPromises = [];
  var i = startBlockNum;
  for (; i <= end; i += str) {
    blockHashesPromises.push(api.rpc.chain.getBlockHash(i));
  }
  // Make sure the ending block is included (in case ending block is skipped due to stride)
  if (i > end && i != end + str) {
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


  for (var i = 0; i < currentBlockIssuance.length - 1; i++) {
    blockIssuanceDic[startBlockNum + (i * str)] = currentBlockIssuance[i];
  }

  blockIssuanceDic[end] = currentBlockIssuance[currentBlockIssuance.length - 1];

  var keyBlockPoints = [];
  var keyBlockNumbers = Object.keys(keyBlockData);
  keyBlockPoints.push({ x: `${startBlockNum}`, y: currentBlockIssuance[0] });
  for (var i = 0; i < keyBlockNumbers.length; i++) {
    if (keyBlockNumbers[i] < startBlockNum || keyBlockNumbers[i] > end) break;

    const keyBlockHash = await api.rpc.chain.getBlockHash(keyBlockNumbers[i]);
    const apiAtCurrentKeyBlock = await api.at(keyBlockHash);
    const issuanceAtKeyBlock = Math.floor((await apiAtCurrentKeyBlock.query.balances.totalIssuance()) / decimals);

    keyBlockPoints.push({ x: `${keyBlockNumbers[i]}`, y: issuanceAtKeyBlock });
    blockIssuanceDic[parseInt(keyBlockNumbers[i])] = issuanceAtKeyBlock;
  }

  keyBlockPoints.push({ x: `${end}`, y: currentBlockIssuance[currentBlockIssuance.length - 1] });

  fs.writeFileSync(filename, JSON.stringify(blockIssuanceDic));

  return [blockIssuanceDic, keyBlockPoints];
}

/**
 * 
 * Creates an HTML file using given data
 * 
 * @param {*} data - block number and issuance data
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
          },
          min: parseInt(labels[0]),
          max: parseInt(labels[labels.length - 1])
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

  var text = "\"";
  for (var i = 2; i < keyPointData.length; i++) {

    if (i == 2) {
      var x1 = parseInt(labels[0]);
      var y1 = parseInt(datapoints[0])
      var x2 = parseInt(keyPointData[i - 1].x);
      var y2 = parseInt(keyPointData[i - 1].y);

      var slope = ((y2 - y1) / y1) / ((x2 - x1) / (365 * 7200)) * 100;

      text = text.concat(`Old Fee System: ${x1} to ${x2} → ${slope}% grade<br><br> `);
    }
    
    var x1 = parseInt(keyPointData[i - 1].x);
    var y1 = parseInt(keyPointData[i - 1].y);
    var x2 = parseInt(keyPointData[i].x);
    var y2 = parseInt(keyPointData[i].y);

    var slope = ((y2 - y1) / y1) / ((x2 - x1) / (365 * 7200)) * 100;

    text = text.concat(`${keyBlockData[x1]}: ${x1} to ${x2} → ${slope}% grade<br><br> `);
  }
  text = text.concat("\"");

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
            width: 100%;
            height: 100%;
            text-align: center;
          }
          div {
            display: block;
            margin: 0 auto;
            width: 80vw;
            height: 80vw;
          }
        </style>
    </head>
    <body>
        <div>
          <canvas id="myChart"></canvas>
          <p id="slopeText"></p>
        </div>
        <script>
            var ctx = document.getElementById('myChart').getContext('2d');
            var myChart = new Chart(ctx, ${JSON.stringify(chartConfig)});

            document.getElementById('slopeText').innerHTML = ${text};

        </script>
    </body>
    </html>
  `;

  fs.writeFileSync(documentName, contents);
}

/**
 * Calls functions for fetching issuance data and drawing a graph
 */
async function drawGraph(args) {

  [_, keyPoints] = await fetchIssuancePerBlock(args);
  const data = JSON.parse(fs.readFileSync(filename));

  console.log(data);

  console.log(keyPoints);

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
