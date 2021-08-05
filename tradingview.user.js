// ==UserScript==
// @name        TradingView Strategy Trades Observer for tradingview.com
// @namespace   Violentmonkey Scripts
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @match       https://www.tradingview.com/chart*
// @grant       GM_addStyle
// @run-at      document-idle
// @version     2.1
// @author      Islam'Alewady (github @nileio)
// @description Monitors TradingView strategy trades and dispatches trading signals to the designated server via websocket.
// ==/UserScript==


/*- MY TODO LIST
. on load change the look and feel of the trades table to 
    have a thicker scrollbar and different colors
    make the header of the table  sticky
.there is a limit of 3000 orders in free version which means the script must handle changing the backtest date automatically to avoid not loading data
*/
//const wsUrl = "wss://username:password@websocketserver:443/ws";  // websocket server using secure socket
//const wsUrl = "ws://username:password@websocketserver:80/ws"; // or websocket server non-secure
const wsUrl = "ws://yourusername:yourpassword@yourwebsockethost/ws"; // change to your websocket server information
const marketSymbol = "XBTUSD"; //  the market symbol to be sent --note at the moment this cannot be a dynamic value--
const strategyTradeLimits = 3000; // set the TradingView strategy limits -- not yet used --
const autoConnect = false; //automatically attempt to reconnect websocket in case of a failed ping. --not yet implemented--

//let gProps, notificationsEnabled, capturedProps, openTrades, openTradeNumbers, lastClosedTradeNo, socket;
let gProps, notificationsEnabled, capturedProps, openTrades, openTradeNumbers, socket;
const docObserverOptions = {
  childList: true,
  subtree: true
};
const tableObserveroptions = {
  childList: true,
  subtree: true
};
new MutationObserver(function (ml, o) {
  const elHeadWrapper = $(".backtesting-head-wrapper div.group:last");
  if (elHeadWrapper.length > 0) {
    o.disconnect();
    console.log(`Trades Observer version: 24-Mar-2020. Document is ready. Enabling switch control..`);
    // always starting with notifications disabled
    notificationsEnabled = false;
    capturedProps = false;
    const switchhtml = `"<div class="group">
    <a href="#">
     <div id="g-notifications-on" class="apply-common-tooltip" title="click to deactivate notifications" style="display:none; padding-top: 3px;">
       <svg height="22" width="50"><path d="M39 21H11C5.5 21 1 16.5 1 11v0C1 5.5 5.5 1 11 1h28c5.5 0 10 4.5 10 10v0c0 5.5-4.5 10-10 10z" fill="#a4e869" stroke="#434d68" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"></path><circle r="10" cy="11" cx="39" fill="#e7eced" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"></circle></svg>
     </div>
     <div id="g-notifications-off" class="apply-common-tooltip" title="click to activate notifications" style="display:none; padding-top: 3px;">
      <svg height="22" width="50"><path d="M11 21h28c5.5 0 10-4.5 10-10v0c0-5.5-4.5-10-10-10H11C5.5 1 1 5.5 1 11v0c0 5.5 4.5 10 10 10z" fill="#d75a4a" stroke="#434d68" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"></path><circle r="10" cy="11" cx="11" fill="#e7eced" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"></circle></svg>
      </div>
    </a>
  </div>"
  `;
    // attach enable/notifications button & init as switched off
    const switchEl = $(switchhtml).insertAfter(elHeadWrapper);
    if (switchEl) {
      $("#g-notifications-on").toggle(false);
      $("#g-notifications-off").toggle(true);
      switchEl.on("click", function (event) {
        enableNotfications(!notificationsEnabled);
      });
    } else {
      const tstamp = new Date();
      console.log(`${tstamp.toLocaleString()} : Fatal Error:could not attach the notifications switch button."`);
    }
  }
}).observe(document, docObserverOptions);

function toggleSwitch(value, reason) {
  if (value !== notificationsEnabled) {
    $("#g-notifications-on").toggle(value);
    $("#g-notifications-off").toggle(!value);
    notificationsEnabled = value;
    openTrades = [];
    openTradeNumbers = [];
    //lastClosedTradeNo = 0;
    if (reason) {
      const tstamp = new Date();
      console.log(`${tstamp.toLocaleString()} : ${reason}`);
    }
    //  toggle is ON
    if (value === true) {
      const title = $(".strategy-select .caption").text();

      gProps = {
        title: title,
        symbol: marketSymbol,
        //(+new Date()).toString(36).slice(-5) //random unique prefex "g0001"; // this prefix is used as an identifier for this strategy
        gPrefix: parseInt(dec2bin(hashCode(title)), 2).toString(16) //hash of the title in a hex string
      };
      capturedProps = false;
      //  debugger;
      //start document observer
      new MutationObserver(docObserverFn).observe(document, docObserverOptions);
    }
  }
}
function enableNotfications(enable) {
  if (enable !== notificationsEnabled) {
    const CONNECTING = 0;
    const OPEN = 1;
    const CLOSING = 2;
    const CLOSED = 3;

    if (enable) {
      if (!socket || socket.readyState === CLOSING || socket.readyState === CLOSED) {
        socket = new WebSocket(wsUrl);
        socket.onopen = function (event) {
          const tstamp = new Date();
          console.log(`${tstamp.toLocaleString()} : sending a handshake..`);
          socket.send("handshake");
        };
        socket.onmessage = function (event) {
          const msg = event.data;
          if (msg.includes("ready")) {
            const tstamp = new Date();
            console.log(`${tstamp.toLocaleString()} :  ${event.data}`);
            toggleSwitch(true);
          }
          if (msg.includes("pong")) toggleSwitch(true); //not yet implemented a ping-pong
        };
        socket.onerror = function (event) {
          const tstamp = new Date();
          console.log(`${tstamp.toLocaleString()} :  socket error.`);
          toggleSwitch(false, "disable notifications due to socket error.");
        };
        socket.onclose = function (event) {
          const tstamp = new Date();
          console.log(`${tstamp.toLocaleString()} :  socket closed with code ${event.code}`);
          toggleSwitch(false, event.wasClean ? "disable notifications due to user request" : "disable notifications due to server socket closed.");
        };
      }
    } else {
      if (socket && (socket.readyState === CONNECTING || socket.readyState === OPEN)) socket.close();
    }
  }
}

const docObserverFn = function (m, observer) {
  if (!notificationsEnabled) {
    const tstamp = new Date();
    console.log(`${tstamp.toLocaleString()} : Notifications disabled.disconnecting document observer...`);
    observer.disconnect();
    return;
  }

  //detect if the table is filled
  if (document.querySelectorAll(".report-content.trades table tr").length > 0) {
    document.querySelector(".reports-content").firstElementChild.scrollTop = Math.pow(10, 10);
    observer.disconnect();
    // identify and click the strategy props button to retrieve strategy props
    //const elPropsIcon = document.getElementsByClassName("icon-button backtesting-open-format-dialog apply-common-tooltip")[0];
    //retrieve some configuration of the selected chart
    //div[@id='header-toolbar-intervals']//div[@class='value-DWZXOdoK']

    const elPropsIcon = evalxpath("//div[@class='icon-button js-backtesting-open-format-dialog apply-common-tooltip']")[0];

    if (elPropsIcon && capturedProps !== true)
      elPropsIcon.addEventListener("click", () => { capturedProps = true; }, { once: true, capture: true });
    if (!capturedProps) {
      elPropsIcon.click();
      let intDl = setInterval(function () {
        //wait  a second for the dialogue to fully load

        // const el = document.querySelector(".dialog-34XTwGTT");
        const activeTab = evalxpath("//div[@class='tab-1l4dFt6c tab-1Yr0rq0J active-37sipdzm']");

        //detect if the props is open
        //if (el) {

        if (activeTab && activeTab.length > 0) {
          clearInterval(intDl);
          // const tstamp = new Date();
          //  console.log(`${tstamp.toLocaleDateString()} ${tstamp.toLocaleTimeString()} : Strategy Props Dialogue detected. disconnected document observer...`);
          const tabTxt = activeTab[0].innerText;
          switch (tabTxt) {
            case "Style": {
              activeTab[0].previousSibling.click();
              //simulate(evalxpath("//div[@class='tab-1l4dFt6c tab-1Yr0rq0J active-37sipdzm']")[0].previousSibling, "click");
              break;
            }
            case "Inputs": {
              activeTab[0].nextSibling.click();
              // simulate(evalxpath("//div[@class='tab-1l4dFt6c tab-1Yr0rq0J active-37sipdzm']")[0].nextSibling, "click");
              break;
            }
            case "Properties": {
              activeTab[0].click();
              // simulate(evalxpath("//div[@class='tab-1l4dFt6c tab-1Yr0rq0J active-37sipdzm']")[0], "click");
              break;
            }
          }
          //wait and grab the data and cancel the dialogue
          setTimeout(function () {
            const isContracts =
              evalxpath(
                "//div[@class='content-jw-2aYgg']//div[@class='container-AqxbM340 input-2M6pUl-Q intent-default-saHBD6pK border-thin-2A_CUSMk size-medium-2saizg8j']/div[.='Contracts']"
              ).length > 0;
            const isUSD =
              evalxpath(
                "//div[@class='content-jw-2aYgg']//div[@class='container-AqxbM340 input-2M6pUl-Q intent-default-saHBD6pK border-thin-2A_CUSMk size-medium-2saizg8j']/div[.='USD']"
              ).length > 0;
            const isEquity =
              evalxpath(
                "//div[@class='content-jw-2aYgg']//div[@class='container-AqxbM340 input-2M6pUl-Q intent-default-saHBD6pK border-thin-2A_CUSMk size-medium-2saizg8j']/div[.='% of equity']"
              ).length > 0;

            Object.assign(gProps, {
              initCapital: evalxpath(
                "//div[@class='content-jw-2aYgg']//div[@class='inner--hn7i_PK']/div[@class='inputWithErrorWrapper-3VldItns thickBorder-17UV-SuS input-2M6pUl-Q']//div[@class='innerInputContainer-FSOtBYl0']"
              )[0].firstElementChild.value.replace(/\D/g, ""),
              orderSize: evalxpath("//div[@class='content-jw-2aYgg']/div[6]//div[@class='innerInputContainer-FSOtBYl0']")[0].firstElementChild.value,
              orderSizeType: isContracts ? "Contracts" : isUSD ? "USD" : isEquity ? "% of equity" : "unknown",
              pyramiding: evalxpath("//div[@class='content-jw-2aYgg']/div[8]//div[@class='innerInputContainer-FSOtBYl0']")[0].firstElementChild.value
            });
            // document.querySelector(".dialog-34XTwGTT")
            const btn = document.querySelector(".dialog-34XTwGTT button[name=cancel]");
            btn.click();
            const tstamp = new Date();
            console.log(`${tstamp.toLocaleString()} : enabling trades observer...`);
            new MutationObserver(tradesObserverFn).observe(document.querySelector(".reports-content"), tableObserveroptions);
            //simulate(btn, "click");
            //allow 2 seconds for the tab to load and to ensure you can click on cancel
          }, 3000);

        } else {
          const tstamp = new Date();
          console.log(`${tstamp.toLocaleString()} : waiting for Strategy Props Dialogue.`);
        }


      }, 1000);
    }
  }
};

const tradesObserverFn = function (mutationList, observer) {
  if (!notificationsEnabled) {
    const tstamp = new Date();
    console.log(`${tstamp.toLocaleString()} : disconnecting trades observer ...`);
    observer.disconnect();
    return;
  }
  document.querySelector(".reports-content").firstElementChild.scrollTop = Math.pow(10, 10);
  //changeCount++;

  //console.log("i can do something else here while waiting for change no!..", changeCount);
  getTableSignals(mutationList).then(function (result) {
    if (result && notificationsEnabled) {
      //notify of the result to upstream
      socket.send(JSON.stringify(result));
    }
    if (result && notificationsEnabled === false) {
      //notify of the result to upstream
      const tstamp = new Date();
      console.log(
        `${tstamp.toLocaleString()} : trades observer is ON, however, notifications are disabled or socket is in error. Check console log.`
      );
    }
  });
};

function getTableSignals(mutationList) {
  return new Promise(function (resolve, reject) {
    let JSONmsg = { entry: {}, exit: {} };
    const gPrefix = gProps.gPrefix;
    //UPDATE: 24th March, 2020 the below line was really good idea to reduce the time it takes to scan the table
    // but it turns out that trade numbers are completely unreliable..they change on every table change , so can no longer depend on them, and now
    // setting startingTradeNo to be always one.
    //const startingTradeNo = lastClosedTradeNo > 0 ? lastClosedTradeNo + 1 : openTradeNumbers.length > 0 ? Number(openTradeNumbers[0]) : 1;
    //with the original idea of using startingTradingNo the if statement below includes a new check
    //Number(mutation.addedNodes[0].rows[0].cells[0].innerText) >= startingTradeNo
    //const startingTradeNo = 1
    mutationList.forEach(mutation => {

      if (
        mutation.type === "childList" &&
        mutation.target.tagName === "TABLE" &&
        mutation.addedNodes.length > 0 &&
        mutation.addedNodes[0].nodeName === "TBODY"
      ) {
        const entry = mutation.addedNodes[0].rows[0];
        const exit = mutation.addedNodes[0].rows[1];
        const tradeNo = entry.cells[0].innerText;

        const prevTrade = mutation.previousSibling || null;
        let preventry, prevexit, prevTradeNo;
        if (prevTrade) {
          preventry = prevTrade.rows[0] || null;
          prevexit = prevTrade.rows[1] || null;
          prevTradeNo = preventry.cells[0].innerText || null;
        }

        //entry signal message structure
        if (mutation.addedNodes[0].rows[1].cells[1].innerText.trim() === "Open" && mutation.addedNodes[0].rows[0].cells[4].innerText.trim().length > 0) {
          if (openTradeNumbers.includes(tradeNo) === false) {
            //.replace(/\D/g, "_");
            let dateTimeStamp = getEpochTime(entry.cells[3].innerText);
            let entryuId = gPrefix + "_" + tradeNo + "_e_" + dateTimeStamp;
            const newTrade = {
              [tradeNo]: {
                entry: {
                  uid: entryuId,
                  symbol: marketSymbol,
                  gPrefix: gPrefix,
                  tradeno: tradeNo,
                  prev_x_uid:
                    prevTradeNo ? (prevTradeNo && prevexit.cells[2].innerText.trim().length > 0
                      ? gPrefix + "_" + prevTradeNo + "_x_" + getEpochTime(prevexit.cells[2].innerText)
                      : null) : null,
                  prev_x_status: prevexit ? (prevexit.cells[1].innerText === "Open" ? "Open" : "Closed") : null,
                  prev_e_uid: preventry ? gPrefix + "_" + prevTradeNo + "_e_" + getEpochTime(preventry.cells[3].innerText) : null,
                  prev_e_side: preventry ? (preventry.cells[1].innerText === "Entry Long" ? "Buy" : "Sell") : null,
                  type: entry.cells[1].innerText,
                  comment: entry.cells[2].innerText,
                  date: entry.cells[3].innerText,
                  dateTimeStamp: dateTimeStamp,
                  price: entry.cells[4].innerText,
                  strategy: gProps
                },
                exit: {
                  uid: null,
                  entryuid: entryuId,
                  symbol: marketSymbol,
                  gPrefix: gPrefix,
                  tradeno: tradeNo,
                  type: exit.cells[0].innerText,
                  comment: exit.cells[1].innerText
                }
              }
            };
            console.log("entry trade detected ", tradeNo);
            openTradeNumbers.push(tradeNo);
            //  Object.assign(openTrades, { [tradeNo]: newTrade }); i considered using openTrades as Object but then there maybe a lot of impacts for this change.
            // dont remember why i originally ended up using an array for openTrades rather than just an Object.
            openTrades.push(newTrade);
            Object.assign(JSONmsg.entry, newTrade);
          } else if (openTradeNumbers.includes(tradeNo)) {
            const openTradeindx = openTrades.findIndex(item => item.hasOwnProperty(tradeNo));
            //edit price for an existing entry message structure
            if (Number(openTrades[openTradeindx][tradeNo].entry.price) !== Number(entry.cells[4].innerText)) {              
              let dateTimeStamp = getEpochTime(entry.cells[3].innerText);
              let entryuId = gPrefix + "_" + tradeNo + "_e_" + dateTimeStamp; //.replace(/\D/g, "_");
              //we ensure that we also update the details of the existing trade in memory.
              openTrades[openTradeindx][tradeNo].entry.price = entry.cells[4].innerText;
              openTrades[openTradeindx][tradeNo].entry.type = entry.cells[1].innerText;
              openTrades[openTradeindx][tradeNo].entry.date = entry.cells[3].innerText;
              openTrades[openTradeindx][tradeNo].entry.dateTimeStamp = dateTimeStamp;
              const editTrade = {
                [tradeNo]: {
                  entry: {
                    uid: entryuId,
                    symbol: marketSymbol,
                    gPrefix: gPrefix,
                    tradeno: tradeNo,
                    prev_x_uid:
                      prevTradeNo ? (prevTradeNo && prevexit.cells[2].innerText.trim().length > 0
                        ? gPrefix + "_" + prevTradeNo + "_x_" + getEpochTime(prevexit.cells[2].innerText)
                        : null) : null,
                    prev_x_status: prevexit ? (prevexit.cells[1].innerText === "Open" ? "Open" : "Closed") : null,
                    prev_e_uid: preventry ? gPrefix + "_" + prevTradeNo + "_e_" + getEpochTime(preventry.cells[3].innerText) : null,
                    prev_e_side: preventry ? (preventry.cells[1].innerText === "Entry Long" ? "Buy" : "Sell") : null,
                    type: entry.cells[1].innerText,
                    comment: 'price change',
                    date: entry.cells[3].innerText,
                    dateTimeStamp: dateTimeStamp,
                    price: entry.cells[4].innerText,
                    strategy: gProps
                  }
                }
              };
              openTrades[openTradeindx][tradeNo].entry.price = entry.cells[4].innerText;
              console.log(`detected entry price change for tradeNo: ${tradeNo}`);
              Object.assign(JSONmsg.entry, editTrade);
            }
          }
        }

        //exit signal message structure
        if (mutation.addedNodes[0].rows[1].cells[1].innerText.trim() !== "Open" && mutation.addedNodes[0].rows[1].cells[3].innerText.trim().length > 0) {
          if (openTradeNumbers.length > 0 && openTradeNumbers.includes(tradeNo)) {
            const openTradeindx = openTrades.findIndex(item => item.hasOwnProperty(tradeNo));
            const dateTimeStamp = getEpochTime(exit.cells[2].innerText);
            // NOTE: it is not supported in the current version to edit the price of an exit trade
            // currently i remove the openTrade once an exit is recieved so no longer monitoring the trade
            Object.assign(openTrades[openTradeindx][tradeNo].exit, {
              uid: gPrefix + "_" + tradeNo + "_x_" + dateTimeStamp,
              comment: exit.cells[1].innerText,
              date: exit.cells[2].innerText,
              dateTimeStamp: dateTimeStamp,
              price: exit.cells[3].innerText
            });
            Object.assign(openTrades[openTradeindx][tradeNo].entry, {
              prev_x_uid:
                prevTradeNo && prevexit.cells[2].innerText.trim().length > 0
                  ? gPrefix + "_" + prevTradeNo + "_x_" + getEpochTime(prevexit.cells[2].innerText)
                  : null,
              prev_x_status: prevexit ? (prevexit.cells[1].innerText === "Open" ? "Open" : "Closed") : null,
              contracts: entry.cells[5].innerText,
              profit: entry.cells[6].innerText,
              cumProfit: entry.cells[7].innerText,
              runUp: entry.cells[8].innerText,
              drawDown: entry.cells[9].innerText
            });
            Object.assign(JSONmsg.exit, openTrades[openTradeindx]);

            openTradeNumbers.splice(openTradeNumbers.indexOf(tradeNo), 1);
            openTrades.splice(openTradeindx, 1);
            //lastClosedTradeNo = Number(tradeNo);
            console.log(`closing trade ${tradeNo}`);
          }
        }
      }
    });
    resolve(Object.keys(JSONmsg.entry).length > 0 || Object.keys(JSONmsg.exit).length > 0 ? JSONmsg : null);
  });
}

function evalxpath(xpath, context) {
  var doc = (context && context.ownerDocument) || document;
  var result = doc.evaluate(xpath, context || doc, null, XPathResult.ANY_TYPE, null);
  switch (result.resultType) {
    case XPathResult.NUMBER_TYPE:
      return result.numberValue;
    case XPathResult.STRING_TYPE:
      return result.stringValue;
    case XPathResult.BOOLEAN_TYPE:
      return result.booleanValue;
    default:
      var nodes = [];
      var node;
      while ((node = result.iterateNext())) nodes.push(node);
      return nodes;
  }
}

// new ideas here for v2 of this script

// move all notifications code to a single location
// add config settings,etc.
// add panel on the screen to enable/disable & change config
// you can use CustomEvent for centralised notifications mechansim. its event based
function hashCode(s) {
  let h;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;

  return h;
}
function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}
function getEpochTime(date) {
  let x = Array.from(date.matchAll(/\d*[^\D]/g));
  return new Date(x[0][0], x[1][0] - 1, x[2][0], x[3][0], x[4][0]).getTime();
}
