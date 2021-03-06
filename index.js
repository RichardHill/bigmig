'use strict';

const ig = require('node-ig-api');
const util = require('util');

//DEVELOPMENT TASKS.
//1. SET STOPS
//2. SET LIMITS
//3. Store the opening market price.
//4. Move the stop on a profitable position?
//5. Is the market going up or down ? Buy or Sell?

const markets = [{ epic: 'IX.D.DAX.DAILY.IP', stop: 50, size: 1, profit: 2, cumulativeTradeAmount: 0, rollingAverage: 0, openingPrice: 0 },
{ epic: 'IX.D.FTSE.DAILY.IP', stop: 50, size: 1, profit: 2, cumulativeTradeAmount: 0, rollingAverage: 0, openingPrice: 0 },
{ epic: 'IX.D.NIKKEI.DAILY.IP', stop: 100, size: 1, profit: 5, cumulativeTradeAmount: 0, rollingAverage: 0, openingPrice: 0 },
{ epic: 'IX.D.DOW.DAILY.IP', stop: 100, size: 1, profit: 5, cumulativeTradeAmount: 0, rollingAverage: 0, openingPrice: 0 }];

const direction = {
  buy: 'BUY',
  sell: 'SELL',
};

const dailyProfit = 50;

let invocationCount = 0;

const processMarkets = async (positions, markets) => {

  if (markets == null || markets == undefined
    && positions == null || positions == undefined) {
    return markets;
  }

  let marketsToAnalyse = null;

  marketsToAnalyse = markets.filter(market => {
    return !positions.find(position => {
      return position.market.epic === market.epic;
    })
  });

  console.log("Markets to be analysed are -: ", marketsToAnalyse);

  marketsToAnalyse.forEach(async market => {

    //Get the current volumes being traded
    const dateTimeNow = new Date(Date.now());
    const dateStart = new Date(Date.now());

    dateStart.setHours(6); //Get the markets morning value.
    console.log("Historical data for -: ", market.epic);

    // DAY, HOUR, HOUR_2, HOUR_3, HOUR_4, MINUTE, MINUTE_10, MINUTE_15, MINUTE_2, MINUTE_3, MINUTE_30, MINUTE_5, MONTH, SECOND, WEEK
    const historicPrices = await ig.histPrc(market.epic, 'MINUTE', dateStart.toISOString(), dateTimeNow.toISOString());
    const firstHistoricPrice = historicPrices.prices[0];
    const lastHistoricPrice = historicPrices.prices[historicPrices.prices.length - 1];

    //console.log(util.inspect(historicPrices, false, null));
    //console.log('First Historic Price -: ', firstHistoricPrice);
    //console.log('Last Historic Price', lastHistoricPrice);
    //historicPrices.prices.forEach((price) => {
    //});

    //Lets try and dictate the direction that the market is going in - UP or DOWN???
    const marketDirection = (((firstHistoricPrice.closePrice.ask - firstHistoricPrice.closePrice.bid) / 2) - ((lastHistoricPrice.closePrice.ask - lastHistoricPrice.closePrice.bid) / 2));
    console.log("Market Direction is -: ", marketDirection);

    if (marketDirection >= 0) {
      console.log("BUY  in -: ", market.epic);
      placePosition(market, direction.buy);
    } else {
      console.log("SELL in -: ", market.epic);
      placePosition(market, direction.sell);
    }
  });
};

const processPositions = (positions) => {

  if (positions.length === 0) return;

  positions.forEach((positionInformation) => {

    const thePosition = positionInformation.position;
    const theMarket = positionInformation.market;

    console.log("Position Info -:", util.inspect(positionInformation, false, null));
    const profit = (thePosition.direction === direction.buy) ? theMarket.bid - thePosition.openLevel : thePosition.openLevel - theMarket.offer;

    console.log("Position Value -: ", profit);

    if (profit > 5) {
      ig.closePosition(thePosition.dealId);
    }
  });
};

const shouldWeTrade = async (profitTarget) => {
  let profit = 0;
  try {

    const dateTimeNow = new Date().toJSON().slice(0, 10);
    const from = dateTimeNow;
    const to = dateTimeNow;

    const results = await ig.acctTransaction('ALL', dateTimeNow, dateTimeNow, 500, 0);
    results.transactions.forEach(transaction => {
      profit += parseFloat(transaction.profitAndLoss.substring(1, transaction.profitAndLoss.length));
    });
  }
  catch (error) {
    console.log("Account Transactions returned an error ", error);
  }

  console.log("Current Profit for today is -:", profit);

  if (profit > profitTarget) {
    return false;
  } else {
    return true;
  }

}

const placePosition = (market, direction) => {

  let ticket = {
    'currencyCode': 'GBP',
    'direction': direction,
    'epic': market.epic,
    'expiry': 'DFB',
    'size': market.size,
    'forceOpen': true,
    'orderType': 'MARKET',
    'level': null,
    'limitDistance': market.profit,
    'limitLevel': null,
    'stopDistance': market.stop,
    'stopLevel': null,
    'guaranteedStop': false,
    'timeInForce': 'FILL_OR_KILL',
    'trailingStop': null,
    'trailingStopIncrement': null
  };

  ig.deal(ticket).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));

};

module.exports.handler = async (event, context) => {
  return new Promise(async (resolve, reject) => {

    console.log("Invocation count is -: ", invocationCount);

    const loginResponse = await ig.login(true);

    //Get a list of all open positions.
    const positionsRepsonse = await ig.get('/positions');

    //Get the first position from the response.
    const positions = positionsRepsonse.body.positions;

    if (shouldWeTrade(dailyProfit) === false) {
      processMarkets(positions, markets);
    }
    else {
      console.log("Good news - profit for today has been reached... ceasing trading!");
    }
    //Having performed our analysis we now log out - preparing the account for login later.
    ig.logout().then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));

    return true;
  });
};