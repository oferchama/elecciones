# La Moncloa: a Spanish political simulator

**Play it online: [elecciones.regalitogames.com](https://elecciones.regalitogames.com)**

A turn-based government simulator set in Spain. You lead a minority government: you set policy, balance the budget, keep voter groups happy and stay in power through Spain's real electoral system.

## Play

The quickest way is to double-click `index.html`. It needs no build step. Online, it also loads fonts from Google and the province map (IGN boundaries via [es-atlas](https://github.com/martgnz/es-atlas)) from jsDelivr; offline, everything else still works.

Or serve it locally:

```bash
node serve.js
```

Then open http://localhost:8080. Your game autosaves in the browser. To load the autosave directly, open `http://localhost:8080/?continue`. The ☰ menu can download and load save files.

## What's in it

- **84 policies** in 8 areas: taxes (IRPF, IVA, Patrimonio…), labour (SMI, the 37.5-hour week, reforma laboral), pensions, healthcare, territory (financiación singular, amnesty and dialogue, Art. 155, co-official languages), energy (nuclear phase-out, renewables, desalination), housing (rent control, tourist flats, golden visa, land reform, empty-homes tax) and society (bullfighting, Church funding, memoria democrática…).
- **26 indicators** that affect one another with time lags: unemployment, housing costs, risk premium, drought, rural depopulation, territorial tension, birth rate and more. They can tip into 15 situations, such as a housing emergency, recession or independence crisis. Nine forces beyond your control push on top: the world economy, ECB interest rates, oil and gas prices, global tensions, migration pressure, AI and automation, the end of EU recovery funds, climate change and population ageing.
- **22 voter groups**, simulated as about 7,500 individual voters in 52 provinces. Group sizes change: the unemployed track the jobless rate, pensioners grow as Spain ages, renters grow when housing is expensive, and so on. Regional make-up varies: Catalan and Basque nationalists, rural Spain, tourism workers in the islands, and so on.
- **Elections like the real ones**: D'Hondt in every province with a 3% threshold, 350 seats, and an investiture vote (176 in the first round, or more yes than no in the second). There are also repeat elections and motions of no confidence.
- **Fictional parties**: Unión Conservadora, Voz Patriótica, Izquierda Plural, Centro Cívico, and regional parties for Catalonia, the Basque Country, Galicia, the Canaries and "España Vaciada". Regional parties have demands that decide whether they back you.
- **A realistic budget**: about €1.7tn GDP and about 102% debt. Pension costs rise as the population ages, and the interest bill grows as debt is refinanced. There's an EU deficit procedure, a debt crisis and a bailout dilemma.
- **27 events and dilemmas**, many tied to your policies (a low border-control budget makes migrant crises likelier, an underfunded health service makes A&E collapse likelier),, including DANA floods, wildfires, the blackout, migrant boats reaching the Canaries, tractor protests, a unilateral referendum and corruption scandals.

**Six starting scenarios**: Spain today (2027), an absolute majority, the 2006 housing bubble, the 2012 Great Recession, the 2017 Catalan crisis, or a randomly generated Spain. In the reality scenario the parliament is calibrated to resemble the 2023 Congress.

**Tax revenue follows the economy**: income tax and social security contributions follow the wage bill (people in work × average pay), VAT follows consumer and tourist spending, and corporate tax follows profits. Income tax is progressive, so it grows faster than wages. Raising taxes costs 2.5× the usual political capital.

## Project layout

| File | Purpose |
|---|---|
| `js/scenario-spain.js` | **All Spain-specific content**: policies, indicators, voter groups, parties, provinces, events |
| `js/engine.js` | Generic simulation: effects network, budget, voters, D'Hondt, investiture |
| `js/ui.js`, `js/charts.js` | Interface and SVG charts |
| `css/style.css` | Styles (light and dark) |

## Adding another country

Copy `scenario-spain.js` and change the data. The engine knows nothing about Spain.

Effects are written as strings like `'unemployment -0.04, workers 0.2, growth 0.03 sqrt'`. At game start the engine calibrates baselines so that the opening state is an equilibrium. Effects therefore describe how *changes* ripple through the country, and you don't need to hand-tune starting values.

For party vote shares, give each party a `target` share. The engine fits each party's popularity so that the opening poll matches.
