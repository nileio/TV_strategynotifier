# TradingView Strategy Notifier

TradingView Stategy Notifier is a simple JS script that can be loaded using a Chrome, Firefox extension such as Tampermonkey, Violentmonkey, Greasemonkey, etc.

The script scraps the Strategy data in real-time and pushes data to a user defined websocket server.

# Disclaimer

I am sharing this script strictly for educational and demo purposes only. It is in no way to be used for commercial purposes and it is not intended for use by individuals to bypass the Free Version limitations. TradingView is a great piece of software, if you use it, Pay for it.
<I dont know if the script still works or not I haven't tested it for a while! :)>

# Why did I create this?

I was creating my own custom trading bot and I needed a quick and dirty way of quickly testing trading strategies. I was only using the free version of TradingView. I wanted to evaluate the product and the strategy in real-time, and execute trades from my own trading bot which I built using a NodeJS app.

I also had some time and wanted to learn something new , that is , client-side JS scrapping techniques.

# What does it do?

* Creates a new button to enable and disable the script in TradingView Strategy tab interface.
* Reads the configuration data of the Streategy and uses the data to configure the script.
* Once new trades are populated in the table, the script pushes the trades to a remote websocket server.

# You cannot

* Use the script to create a commercial product or use it to avoid paying for a full subscription to TradingView.
* Claim that my script has caused you to lose your money! Use it at your own risk for education or strategy testing purposes only.

# How Does it Work?

* The script simply listen for changes on the Strategy table using Javascript Observer pattern, and once new or updated trades are created it detects the change, and creates new records in JSON structure. The script maintains a memory store of the open trades and resets on closed trades.
* It maintains an internal id and keeps the original trade numbers of the trade so it does not duplicate the dispatch of those trades. Do not depend on the trade numbers from TradingView because they actually change with updates to the table making them non-unique, so the `uid` created should be unique for the strategy execution. However, donot depend on this too, you need to employ some mechansim in your trading bot to ensure the trades are not duplicates. Note when the notifications is enabled, the script attempts to load the general information of the strategy and reads the attributes such as `initial capital`, `symbol`, etc.

# How to Use it ?

* Add your websocket server information in the script and save it, 
* open any chart in TradingView and add a Strategy, configure the strategy and ensure it runs for forward testing too. 
* Make sure the script is loaded. It will be indicated by your extension if the script is loaded in the page or not. You can also determine if the script is loaded if you check the Strategy tab in TradingView, a button should show up which lets you enable the notifications to the configured websocket server. Note the script is configured to be automatically loaded for this website pattern https://www.tradingview.com/chart* , modify it as needed.
* Enable the notifications by clicking the button and your configured websocket server should now start recieving the data as they arrive.

# Output

Stretegy table trades are automatically sent to the Websocket server if the script is enabled. The websocket server should recieve the data in the following JSON format.

An entry would look like

```
strategy:  {
    title:  <title of the strategy>
    symbol: <market symbol>
    initCapital: <configured initial capital>
    orderSize: <configured order size>
    orderSizeType: <Contracts, USD or Equity>
    pyramiding: <configured pyramiding attribute>
    gPrefix: <prefix used as an identifer for this strategy, it is a hash of the title of the strategy in a hex string>
},
entry:{
  uid: <id of the entry trade>
  symbol: <market symbol>
  gPrefix: <prefix used as an identifer for this strategy, it is a hash of the title of the strategy in a hex string>
  tradeno: <trade number>
  prev_x_uid: <uid of the previous exit trade>
  prev_x_status: <status of the previous exit trade>
  prev_e_uid: <uid of the previous entry trade>
  prev_e_side: <side of the previous entry>
  type: <entry type>
  comment: <text comment of the entry>
  date: <datetime of the entry>
  dateTimeStamp: <numberical timestamp of the entry trade>
  price: <entry price>

}
```

An exit trade would look like
```
exit: {
  uid: <id of the exit trade>
  entryuid: <id of the corresponding entry trade>
  symbol: <market symbol>
  gPrefix: <strategy prefix>
  tradeno: <trade number>
  type: <type of trade Long/Short>
  comment: <text comment of the trade>
}
```

If a trade is edited by TradingView, the data is updated and pushed to the websocket server. Your trading bot should keep the open trade id, so if a change is detected it can update the same trade.


# Limitations

You got to enter the 

# Thanks

If you using the script or like it, do me a favor and at least hit the star button or leave a comment. It took so many hours to create. 
Remember this is strictly for educational purposes , dont use it with real trades! Enjoy
