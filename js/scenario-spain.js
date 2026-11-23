/*
 * Scenario: Spain (España)
 * ------------------------------------------------------------
 * All country-specific content lives in this file. The engine is generic:
 * to build another country, copy this file and change the data.
 *
 * Effect strings: "target amount [curve]" separated by commas.
 *   target : id of an indicator (sim) or a voter group
 *   amount : how strongly the source pushes the target (+/-)
 *   curve  : optional  'sqrt' (big early impact) | 'sq' (impact grows late)
 * The engine calibrates baselines so the starting state is an equilibrium;
 * effects therefore describe how CHANGES ripple through the country.
 */
(function (G) {
  const pct = (x, d = 1) => x.toFixed(d) + '%';
  const eur = (bn) => '€' + (bn >= 100 ? bn.toFixed(0) : bn.toFixed(1)) + 'bn';

  const S = {
    id: 'spain',
    country: 'Spain',
    countryLocal: 'España',
    startYear: 2027,
    termLength: 16, // quarters (4 years)
    chamberSeats: 350,
    majority: 176,
    threshold: 0.03, // 3% per constituency (D'Hondt)
    gdp0: 1680, // € bn, nominal
    budgetRefGdp: 1680, // economy size the policy budget amounts below are written for
    debt0: 1710, // € bn
    targetDeficit0: 0.028, // starting deficit, share of GDP
    revenueShare0: 0.415, // starting public revenue, share of GDP
    effRate0: 0.022, // average interest paid on the debt stock
    baseMarketRate: 0.024, // euro-area benchmark (Bund) yield
  };

  // Interest rate on new Spanish debt: benchmark + risk premium + ECB policy
  S.marketRate = (s) => 0.024 + s.riskPremium * 0.06 + (s.ecbRates - 0.4) * 0.05;
  // Budget lines driven by external forces (€bn/yr at value 1)
  S.externalBudget = [{ sim: 'euFunds', name: 'EU recovery funds', kind: 'rev', amount: 25 }];

  /* ---------------------------------------------------------------
   * INDICATORS (simulation values, 0..1 internally)
   * ------------------------------------------------------------- */
  S.sims = {
    growth: {
      name: 'Economic Growth', local: 'Crecimiento del PIB', cat: 'Economy', init: 0.55, inertia: 0.35, good: 'high',
      fmt: (v) => (v * 10 - 3).toFixed(1) + '%', unit: 'real GDP growth / yr',
      desc: 'Annual real GDP growth. Drives jobs, tax revenue and the general mood.',
      fx: 'unemployment -0.32, investment 0.22, poverty -0.06, crime -0.03, everyone 0.25, selfEmployed 0.2, wealthy 0.12, inflation 0.1, emissions 0.05, immigration 0.15, housing 0.06, energy 0.03',
    },
    unemployment: {
      name: 'Unemployment', local: 'Paro', cat: 'Economy', init: 0.35, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 30), unit: 'of the labour force',
      desc: 'Spain has carried the highest unemployment rate in the EU for decades. Youth unemployment is roughly double the headline rate.',
      fx: 'poverty 0.3, crime 0.07, inequality 0.1, everyone -0.3, workers -0.3, youth -0.3, unemployed -0.15, growth -0.06, birthrate -0.08, immigration -0.1, precarity 0.05',
    },
    inflation: {
      name: 'Inflation', local: 'IPC', cat: 'Economy', init: 0.3, inertia: 0.35, good: 'low',
      fmt: (v) => pct(v * 10 - 0.5), unit: 'consumer prices / yr',
      desc: 'Consumer price inflation. Erodes wages; pensions are indexed to it.',
      fx: 'everyone -0.3, lowIncome -0.3, pensioners -0.1, poverty 0.08, growth -0.05, housing 0.05, investment -0.06, wealthy 0.024',
    },
    investment: {
      name: 'Business Confidence', local: 'Confianza empresarial', cat: 'Economy', init: 0.55, inertia: 0.3, good: 'high',
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'confidence index',
      desc: 'How willing firms are to invest and hire in Spain.',
      fx: 'growth 0.22, unemployment -0.08, wealthy 0.1, selfEmployed 0.08',
    },
    productivity: {
      name: 'Productivity & Innovation', local: 'Productividad e innovación', cat: 'Economy', init: 0.4, inertia: 0.12, good: 'high',
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'innovation index',
      desc: 'Spain\'s productivity has stagnated for 25 years. Raising it is slow but lifts everything.',
      fx: 'growth 0.18, investment 0.06, unemployment -0.03, wealthy 0.05',
    },
    precarity: {
      name: 'Job Precarity', local: 'Temporalidad', cat: 'Economy', init: 0.4, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 40), unit: 'temporary contracts',
      desc: 'Share of workers on temporary or insecure contracts.',
      fx: 'workers -0.25, youth -0.25, birthrate -0.06, productivity -0.04, poverty 0.04, selfEmployed 0.04',
    },
    tourism: {
      name: 'Tourism', local: 'Turismo', cat: 'Economy', init: 0.75, inertia: 0.3, good: 'high',
      fmt: (v) => (v * 130).toFixed(0) + 'M', unit: 'international visitors / yr',
      desc: 'Spain is one of the most visited countries on Earth. Tourism is ~12% of GDP but strains housing and water.',
      fx: 'growth 0.12, unemployment -0.08, housing 0.08, tourismWorkers 0.4, water 0.03, emissions 0.03, environmentalists -0.06, tenants -0.05',
    },
    energy: {
      name: 'Energy Prices', local: 'Precio de la luz', cat: 'Economy', init: 0.45, inertia: 0.3, good: 'low',
      fmt: (v) => '€' + (v * 180).toFixed(0) + '/MWh', unit: 'wholesale electricity',
      desc: 'Wholesale electricity price. Cheap solar has pushed Spanish prices below the EU average.',
      fx: 'inflation 0.12, growth -0.08, everyone -0.12, lowIncome -0.1, selfEmployed -0.1, farmers -0.08, investment -0.05',
    },
    riskPremium: {
      name: 'Risk Premium', local: 'Prima de riesgo', cat: 'Economy', init: 0.11, inertia: 0.3, good: 'low',
      fmt: (v) => (v * 600).toFixed(0) + ' bp', unit: 'spread over German bund',
      desc: 'Extra interest markets demand to lend to Spain. Rises with debt and deficits. Above ~300bp, a debt crisis looms.',
      fx: 'growth -0.15, investment -0.15, wealthy -0.08, everyone -0.05',
    },
    housing: {
      name: 'Housing Cost', local: 'Coste de la vivienda', cat: 'Society', init: 0.7, inertia: 0.18, good: 'low',
      fmt: (v) => pct(v * 55, 0), unit: 'of income spent on rent',
      desc: 'The defining issue for young Spaniards: rents in Madrid, Barcelona, Málaga and the islands have soared.',
      fx: 'tenants -0.6, youth -0.45, parents -0.1, everyone -0.08, wealthy 0.21, birthrate -0.1, poverty 0.08, inequality 0.04, depopulation -0.06',
    },
    poverty: {
      name: 'Poverty Risk', local: 'Riesgo de pobreza (AROPE)', cat: 'Society', init: 0.5, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 52), unit: 'at risk of poverty or exclusion',
      desc: 'Share of people at risk of poverty or social exclusion.',
      fx: 'lowIncome -0.35, crime 0.08, health -0.04, education -0.04, birthrate -0.03, everyone -0.05',
    },
    inequality: {
      name: 'Inequality', local: 'Desigualdad', cat: 'Society', init: 0.55, inertia: 0.15, good: 'low',
      fmt: (v) => (0.25 + v * 0.12).toFixed(3), unit: 'Gini coefficient',
      desc: 'Income inequality (Gini index).',
      fx: 'lowIncome -0.25, workers -0.12, crime 0.06, growth -0.02',
    },
    crime: {
      name: 'Crime', local: 'Criminalidad', cat: 'Society', init: 0.3, inertia: 0.25, good: 'low',
      fmt: (v) => (v * 150).toFixed(0) + '/1000', unit: 'offences per 1,000 people',
      desc: 'Spain is one of Europe\'s safer countries, but perceptions matter.',
      fx: 'everyone -0.25, pensioners -0.2, patriots -0.15, parents -0.1, tourism -0.06, investment -0.04',
    },
    health: {
      name: 'Healthcare', local: 'Sanidad', cat: 'Society', init: 0.6, inertia: 0.2, good: 'high',
      fmt: (v) => ((1 - v) * 300).toFixed(0) + ' days', unit: 'average surgery waiting time',
      desc: 'Quality of the public health system, measured by surgery waiting lists.',
      fx: 'everyone 0.25, pensioners 0.25, parents 0.08',
    },
    education: {
      name: 'Education', local: 'Educación', cat: 'Society', init: 0.5, inertia: 0.1, good: 'high',
      fmt: (v) => (400 + v * 150).toFixed(0), unit: 'PISA score',
      desc: 'School quality. Changes slowly; feeds productivity for a generation.',
      fx: 'productivity 0.15, growth 0.02, parents 0.15, youth 0.08, crime -0.03, inequality -0.03',
    },
    birthrate: {
      name: 'Birth Rate', local: 'Natalidad', cat: 'Society', init: 0.23, inertia: 0.1, good: 'high',
      fmt: (v) => (0.8 + v * 1.4).toFixed(2), unit: 'children per woman',
      desc: 'Spain has one of the lowest fertility rates in the world.',
      fx: 'parents 0.1, catholics 0.1, growth 0.02',
    },
    gender: {
      name: 'Gender Equality', local: 'Igualdad de género', cat: 'Society', init: 0.65, inertia: 0.15, good: 'high',
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'equality index',
      desc: 'Pay gap, representation and protection from gender violence.',
      fx: 'feminists 0.3, birthrate 0.02, catholics -0.03',
    },
    liberty: {
      name: 'Civil Liberties', local: 'Libertades civiles', cat: 'Society', init: 0.65, inertia: 0.25, good: 'high',
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'liberty index',
      desc: 'Freedom of protest, speech and privacy.',
      fx: 'secular 0.1, youth 0.08, everyone 0.03',
    },
    corruption: {
      name: 'Corruption', local: 'Corrupción', cat: 'Society', init: 0.45, inertia: 0.2, good: 'low',
      fmt: (v) => ((1 - v) * 100).toFixed(0) + '/100', unit: 'clean-government score (higher = cleaner)',
      desc: 'Perceived corruption. Scandals have toppled Spanish governments before.',
      fx: 'everyone -0.25, investment -0.08, growth -0.02',
    },
    immigration: {
      name: 'Immigration', local: 'Inmigración', cat: 'Society', init: 0.55, inertia: 0.25, good: null,
      fmt: (v) => (v * 1000).toFixed(0) + 'k', unit: 'net arrivals / yr',
      desc: 'Net migration. Fills labour shortages and props up an ageing population, but is politically divisive.',
      fx: 'growth 0.05, unemployment 0.02, birthrate 0.03, housing 0.05, depopulation -0.03, patriots -0.25, immigrants 0.1, workers -0.04',
    },
    emissions: {
      name: 'CO₂ Emissions', local: 'Emisiones', cat: 'Environment', init: 0.5, inertia: 0.15, good: 'low',
      fmt: (v) => (v * 520).toFixed(0) + ' Mt', unit: 'greenhouse gases / yr',
      desc: 'Greenhouse gas emissions.',
      fx: 'health -0.05, water 0.05, environmentalists -0.45, youth -0.05',
    },
    renewables: {
      name: 'Renewable Power', local: 'Renovables', cat: 'Environment', init: 0.57, inertia: 0.12, good: 'high',
      fmt: (v) => pct(v * 100, 0), unit: 'of electricity generation',
      desc: 'Share of electricity from wind, solar and hydro.',
      fx: 'energy -0.12, emissions -0.15, environmentalists 0.15, investment 0.02',
    },
    water: {
      name: 'Water Stress', local: 'Sequía', cat: 'Environment', init: 0.55, inertia: 0.2, good: 'low',
      fmt: (v) => pct((1 - v) * 100, 0), unit: 'reservoir capacity',
      desc: 'Drought pressure. Climate change makes the south and east increasingly dry.',
      fx: 'farmers -0.45, rural -0.15, environmentalists -0.15, everyone -0.08, growth -0.04, energy 0.03, tourism -0.02',
    },
    depopulation: {
      name: 'Rural Depopulation', local: 'España vaciada', cat: 'Environment', init: 0.6, inertia: 0.1, good: 'low',
      fmt: (v) => pct(v * 100, 0), unit: 'of municipalities shrinking',
      desc: 'Half of Spain\'s territory holds a tiny fraction of its people, and the interior keeps emptying. The more people crowd into the cities, the more expensive city housing gets.',
      fx: 'rural -0.45, farmers -0.15, growth -0.02, housing 0.15',
    },
    infrastructure: {
      name: 'Infrastructure', local: 'Infraestructuras', cat: 'Environment', init: 0.65, inertia: 0.1, good: 'high',
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'infrastructure index',
      desc: 'Roads, rail, grid and broadband. Spain has Europe\'s largest high-speed rail network.',
      fx: 'growth 0.05, tourism 0.03, depopulation -0.04, everyone 0.03, rural 0.08',
    },
    tension: {
      name: 'Territorial Tension', local: 'Tensión territorial', cat: 'Society', init: 0.5, inertia: 0.2, good: 'low',
      fmt: (v) => pct(20 + v * 40, 0), unit: 'support for Catalan independence',
      desc: 'Pressure for independence in Catalonia (and to a lesser extent the Basque Country).',
      fx: 'patriots -0.3, catholics -0.05, everyone -0.04, investment -0.08, growth -0.02',
    },

    /* Forces beyond your control. `drive` sets how each moves every quarter:
     *   target = mean + trend × quarter + amp × sin(cycle);  v += rev × (target − v) + vol × noise */
    world: {
      name: 'Global Economy', local: 'Economía mundial', cat: 'World', init: 0.5, inertia: 1, good: 'high', external: true,
      drive: { mean: 0.5, amp: 0.05, period: 30, phase: 3, rev: 0.15, vol: 0.025, min: 0.2, max: 0.8 },
      fmt: (v) => (v > 0.58 ? 'Booming' : v > 0.52 ? 'Strong' : v > 0.47 ? 'Stable' : v > 0.4 ? 'Weak' : 'Slump'), unit: 'world demand',
      desc: 'The global business cycle. You cannot control it, only prepare for it.',
      fx: 'growth 0.5, tourism 0.25, investment 0.2, energy 0.15',
    },
    climate: {
      name: 'Climate Change', local: 'Cambio climático', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.0035, rev: 1 },
      fmt: (v) => '+' + (1.3 + (v - 0.5) * 4).toFixed(2) + '°C', unit: 'global warming',
      desc: 'Warming keeps rising, worsening Spanish droughts and heatwaves.',
      fx: 'water 0.6, energy 0.05, tourism -0.05, farmers -0.1',
    },
    ageing: {
      name: 'Population Ageing', local: 'Envejecimiento', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.0018, rev: 1 },
      fmt: (v) => pct(20.5 + (v - 0.5) * 40), unit: 'of population aged 65+',
      desc: 'The baby-boom generation is retiring. Pension and health costs rise every year.',
      fx: 'growth -0.15, depopulation 0.15, health -0.2',
    },
    ecbRates: {
      name: 'ECB Interest Rates', local: 'Tipos del BCE', cat: 'World', init: 0.4, inertia: 1, good: null, external: true,
      drive: { mean: 0.4, amp: 0.08, period: 36, phase: 20, rev: 0.12, vol: 0.025, min: 0, max: 1 },
      fmt: (v) => pct(v * 5, 2), unit: 'ECB deposit rate',
      desc: 'Set in Frankfurt for the whole euro area. Higher rates cool inflation but squeeze mortgage holders, slow growth and raise the cost of Spanish debt.',
      fx: 'growth -0.12, inflation -0.1, investment -0.08, housing -0.04, parents -0.06, everyone -0.04, wealthy 0.03',
    },
    oilPrice: {
      name: 'Global Energy Prices', local: 'Petróleo y gas', cat: 'World', init: 0.45, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.45, rev: 0.12, vol: 0.045, min: 0.1, max: 1 },
      fmt: (v) => '$' + (30 + v * 100).toFixed(0) + '/bbl', unit: 'Brent crude oil',
      desc: 'World oil and gas prices. Spain imports almost all its fossil fuels.',
      fx: 'energy 0.25, inflation 0.1, growth -0.06, everyone -0.06, farmers -0.08',
    },
    geopolitics: {
      name: 'Global Tensions', local: 'Tensión geopolítica', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.001, rev: 0.08, vol: 0.035, min: 0.1, max: 1 },
      fmt: (v) => (v > 0.75 ? 'War footing' : v > 0.6 ? 'Very high' : v > 0.48 ? 'High' : v > 0.35 ? 'Moderate' : 'Calm'), unit: 'international conflict risk',
      desc: 'Wars, trade conflicts and pressure from NATO allies. Raises energy prices, scares investors and boosts demand for defence.',
      fx: 'energy 0.06, tourism -0.04, investment -0.05, patriots -0.06, immigration 0.03',
    },
    migrationPressure: {
      name: 'Migration Pressure', local: 'Presión migratoria', cat: 'World', init: 0.5, inertia: 1, good: null, external: true,
      drive: { mean: 0.5, rev: 0.1, vol: 0.04, min: 0.1, max: 1 },
      fmt: (v) => (v > 0.7 ? 'Extreme' : v > 0.58 ? 'High' : v > 0.42 ? 'Normal' : 'Low'), unit: 'crises in the Sahel and Latin America',
      desc: 'Conflict, drought and economic crises abroad push people toward Spain, via Latin America, the Strait and the Canaries route.',
      fx: 'immigration 0.35, patriots -0.05',
    },
    automation: {
      name: 'AI & Automation', local: 'Inteligencia artificial', cat: 'World', init: 0.3, inertia: 1, good: null, external: true,
      drive: { mean: 0.3, trend: 0.006, rev: 1, max: 1 },
      fmt: (v) => (v * 100).toFixed(0) + ' pts', unit: 'adoption of AI in the economy',
      desc: 'AI and robots spread through offices and factories: productivity rises, but some jobs disappear.',
      fx: 'productivity 0.2, investment 0.06, unemployment 0.06, precarity 0.05, workers -0.06, youth -0.03',
    },
    euFunds: {
      name: 'EU Recovery Funds', local: 'Fondos europeos', cat: 'World', init: 0.6, inertia: 1, good: 'high', external: true,
      drive: { mean: 0.6, trend: -0.02, rev: 1, min: 0.2 },
      fmt: (v) => '€' + (v * 25).toFixed(0) + 'bn/yr', unit: 'EU money flowing in',
      desc: 'The NextGenerationEU programme is winding down. As the money dries up, growth and investment lose a prop.',
      fx: 'growth 0.08, investment 0.1, infrastructure 0.04, renewables 0.03',
    },
    realWage: {
      name: 'Real Pay', local: 'Poder adquisitivo', cat: 'Economy', init: 0.5, inertia: 1, good: 'high', external: true, hidden: true, drawer: 'wage',
      fmt: (v) => (v >= 0.5 ? '+' : '') + ((v - 0.5) / 2.5 * 100).toFixed(1) + '%', unit: 'change in purchasing power',
      desc: 'What the average wage buys, after inflation.',
      fx: 'workers 0.35, everyone 0.15, youth 0.1, tenants 0.1, publicSector 0.1',
    },
    debtRatio: {
      name: 'Debt / GDP', local: 'Deuda pública', cat: 'World', init: 1.02, inertia: 1, good: 'low', external: true, hidden: true,
      fmt: (v) => pct(v * 100, 0), unit: 'of GDP',
      desc: 'Public debt as a share of GDP.',
      fx: 'riskPremium 0.5 sq',
    },
    deficitRatio: {
      name: 'Deficit / GDP', local: 'Déficit', cat: 'World', init: 0.28, inertia: 1, good: 'low', external: true, hidden: true,
      fmt: (v) => pct(v * 10, 1), unit: 'of GDP',
      desc: 'Budget deficit (×10).',
      fx: 'riskPremium 0.35, inflation 0.03',
    },
  };

  /* ---------------------------------------------------------------
   * VOTER GROUPS
   *   size   : base share of voters
   *   lr     : pull on members' left(-1)/right(+1) ideology
   *   cen    : pull on members' decentralist(-1)/centralist(+1) axis
   *   start  : starting happiness 0..1
   *   region : per-region size override  { CAT: 0.5, ... }
   *   sizeFx : what makes the group grow or shrink. Same syntax as effects;
   *            size multiplier = 1 + sum of amount x (current - starting value).
   *            Sources: indicators, policies, or `time` (+1 per decade).
   * ------------------------------------------------------------- */
  S.groups = {
    everyone: { name: 'All voters', local: 'Todos', size: 1, lr: 0, cen: 0, start: 0.5, hidden: true },
    pensioners: { name: 'Pensioners', local: 'Jubilados', size: 0.24, lr: 0.12, cen: 0.1, start: 0.55, age: 'old',
      sizeFx: 'ageing 2.5, retirementAge -0.4',
      desc: 'Over a fifth of the electorate and the most reliable voters. Care about pensions and healthcare above all. Grows every year as the baby boomers retire.' },
    youth: { name: 'Young Voters', local: 'Jóvenes', size: 0.15, lr: -0.25, cen: -0.05, start: 0.4, age: 'young',
      sizeFx: 'ageing -1.2, immigration 0.3, unemployment -0.5',
      desc: 'Squeezed by rent, precarious jobs and unemployment; often vote less. Shrinks as Spain ages, grows with young immigrants, and emigrates when there are no jobs. (Babies born today only reach voting age after 18 years.)' },
    parents: { name: 'Parents', local: 'Familias', size: 0.3, lr: 0.05, cen: 0, start: 0.48,
      sizeFx: 'birthrate 1.5, housing -0.3',
      desc: 'Families with children: schools, childcare, housing, safety. Grows with the birth rate.' },
    workers: { name: 'Workers & Unions', local: 'Trabajadores', size: 0.4, lr: -0.25, cen: 0, start: 0.5,
      sizeFx: 'unemployment -0.6, automation -0.25, immigration 0.15',
      desc: 'Wage earners. Back a higher minimum wage, shorter hours and labour protection.' },
    unemployed: { name: 'Unemployed', local: 'Parados', size: 0.105, lr: -0.2, cen: 0, start: 0.35,
      sizeFx: 'unemployment 2.86',
      desc: 'Rises and falls in step with the unemployment rate.' },
    lowIncome: { name: 'Low Income', local: 'Rentas bajas', size: 0.25, lr: -0.3, cen: 0, start: 0.42,
      sizeFx: 'poverty 2',
      desc: 'Households near the poverty line. Size tracks the poverty rate.' },
    selfEmployed: { name: 'Self-employed & SMEs', local: 'Autónomos y pymes', size: 0.14, lr: 0.35, cen: 0.1, start: 0.45,
      sizeFx: 'smeSupport 0.3, socialContrib -0.3, investment 0.4, automation 0.1',
      desc: 'Over three million autónomos. Hate high contributions, red tape and minimum wage hikes.' },
    wealthy: { name: 'Wealthy & Landlords', local: 'Rentas altas y propietarios', size: 0.12, lr: 0.45, cen: 0.1, start: 0.52, age: 'oldBias',
      sizeFx: 'inequality 1.2, growth 0.4, housing 0.4',
      desc: 'Top earners and people who own more than one property. Sensitive to wealth and inheritance taxes and to rent control.' },
    publicSector: { name: 'Civil Servants', local: 'Funcionarios', size: 0.13, lr: -0.15, cen: 0, start: 0.55,
      sizeFx: 'civilService 0.8',
      desc: 'Teachers, doctors, police and administrators. Grows when you hire more public employees.' },
    farmers: { name: 'Farmers', local: 'Agricultores', size: 0.03, lr: 0.3, cen: 0.2, start: 0.4, ruralBoost: 4,
      sizeFx: 'depopulation -0.8, water -0.6, farmSubsidy 0.3, freeTrade -0.2',
      desc: 'Olive groves, vineyards and greenhouses. Hit hard by drought; famous for tractor protests. Fewer farms survive drought and depopulation.' },
    rural: { name: 'Rural Spain', local: 'España vaciada', size: 0, lr: 0.15, cen: 0.15, start: 0.42, ruralShare: true,
      sizeFx: 'depopulation -1.2, remoteWork 0.15, ruralPlan 0.2',
      desc: 'People in the emptying interior: services, transport and connectivity.' },
    catholics: { name: 'Practising Catholics', local: 'Católicos', size: 0.17, lr: 0.5, cen: 0.2, start: 0.5, age: 'oldBias',
      sizeFx: 'time -0.12, immigration 0.1',
      desc: 'Weekly churchgoers. Value subsidised religious schools, family support and church funding. Slowly shrinking as Spain secularises.' },
    secular: { name: 'Secular Progressives', local: 'Laicos', size: 0.33, lr: -0.32, cen: -0.05, start: 0.52, age: 'youngBias',
      sizeFx: 'time 0.06',
      desc: 'Want a strictly secular state and expanded civil rights.' },
    environmentalists: { name: 'Greens & Animal Lovers', local: 'Ecologistas y animalistas', size: 0.2, lr: -0.38, cen: -0.05, start: 0.48, age: 'youngBias',
      sizeFx: 'climate 1.5, water 0.5, emissions 0.4, time 0.05',
      desc: 'Climate, water, biodiversity and animal welfare. Grows as climate change bites.' },
    feminists: { name: 'Feminists', local: 'Feministas', size: 0.22, lr: -0.35, cen: 0, start: 0.55,
      sizeFx: 'gender 0.3, time 0.04',
      desc: 'Spain\'s 8M marches are among the largest in the world.' },
    patriots: { name: 'Spanish Patriots', local: 'Patriotas', size: 0.22, lr: 0.5, cen: 0.9, start: 0.45, region: { CAT: 0.1, PV: 0.08, NAV: 0.15, GAL: 0.15 },
      sizeFx: 'tension 0.6, immigration 0.4, geopolitics 0.3',
      desc: 'Defend national unity, the monarchy and traditions. Oppose concessions to separatists. Grows when territorial tension or immigration rise.' },
    catalanNat: { name: 'Catalan Nationalists', local: 'Independentistas catalanes', size: 0, lr: -0.05, cen: -1, start: 0.45, region: { CAT: 0.48, BAL: 0.06, VAL: 0.04 },
      sizeFx: 'tension 1.2, recentralisation 0.5, dialogue -0.2, catalanFiscal -0.15',
      desc: 'Want self-determination, fiscal autonomy and protection of the Catalan language. Crackdowns swell their ranks; concessions slowly deflate them.' },
    basqueNat: { name: 'Basque Nationalists', local: 'Nacionalistas vascos', size: 0, lr: -0.05, cen: -1, start: 0.52, region: { PV: 0.5, NAV: 0.22 },
      sizeFx: 'tension 0.3, recentralisation 0.3',
      desc: 'Defend Basque self-government and the special tax regime (concierto).' },
    immigrants: { name: 'Immigrant Citizens', local: 'Nuevos españoles', size: 0.07, lr: -0.15, cen: 0.05, start: 0.5,
      sizeFx: 'immigration 1.2, regularisation 0.3, time 0.15',
      desc: 'Naturalised voters, mostly from Latin America. Grows with immigration and naturalisations.' },
    tenants: { name: 'Renters', local: 'Inquilinos', size: 0.2, lr: -0.2, cen: 0, start: 0.38, age: 'youngStrong',
      sizeFx: 'housing 1.0, publicHousing -0.3, firstHome -0.2',
      desc: 'Spend a huge share of their income on rent. Concentrated in big cities. More people are stuck renting when housing is expensive.' },
    tourismWorkers: { name: 'Tourism Sector', local: 'Sector turístico', size: 0.07, lr: 0.1, cen: 0, start: 0.6, tourismBoost: true,
      sizeFx: 'tourism 1.5',
      desc: 'Hotels, bars and restaurants. Huge in the islands and along the coast.' },
    bullfighting: { name: 'Bullfighting Fans', local: 'Aficionados taurinos', size: 0.07, lr: 0.4, cen: 0.4, start: 0.5, region: { CAT: 0.01, PV: 0.02, GAL: 0.02, CAN: 0.01 },
      sizeFx: 'time -0.15, bullfighting 0.3',
      desc: 'Defend la fiesta nacional as cultural heritage. An ageing, shrinking audience.' },
  };

  /* ---------------------------------------------------------------
   * POLICIES
   *   init   : starting level (0..1) or null = not in force
   *   intro  : political capital to introduce (changes cost a share of it)
   *   budget : [ 'rev'|'spend', € bn per year at level 1, scale ]
   *            scale: gdp | ageing | unemp | tourism
   *   lr/cen : how the policy shifts your party's perceived position
   *   levels : labels from low to high
   * ------------------------------------------------------------- */
  const P = [];
  const pol = (o) => P.push(o);

  // ── Taxation ─────────────────────────────────────────────────
  pol({ id: 'incomeTax', cat: 'tax', name: 'Income Tax', local: 'IRPF', init: 0.5, intro: 30, budget: ['rev', 262, 'wagesProg'], lr: -0.25,
    levels: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Progressive personal income tax, Spain\'s largest single tax. Shared with the regions.',
    fx: 'growth -0.08, investment -0.05, inequality -0.15, wealthy -0.35, selfEmployed -0.15, workers -0.08, everyone -0.08' });
  pol({ id: 'vat', cat: 'tax', name: 'VAT', local: 'IVA', init: 0.5, intro: 30, budget: ['rev', 184, 'consumption'], lr: 0.05,
    levels: ['10%', '15%', '21%', '25%', '28%'],
    desc: 'Value-added tax on consumption. Regressive: hits the poor hardest.',
    fx: 'inflation 0.08, poverty 0.08, inequality 0.06, growth -0.04, tourism -0.04, lowIncome -0.2, selfEmployed -0.1, everyone -0.05' });
  pol({ id: 'corpTax', cat: 'tax', name: 'Corporate Tax', local: 'Impuesto de Sociedades', init: 0.5, intro: 25, budget: ['rev', 78, 'profits'], lr: -0.25,
    levels: ['15%', '20%', '25%', '30%', '35%'],
    desc: 'Tax on company profits. Large firms pay far less than the headline rate thanks to deductions.',
    fx: 'investment -0.2, growth -0.06, unemployment 0.03, productivity -0.04, selfEmployed -0.2, wealthy -0.15, workers 0.05' });
  pol({ id: 'socialContrib', cat: 'tax', name: 'Social Security Contributions', local: 'Cotizaciones sociales', init: 0.5, intro: 30, budget: ['rev', 390, 'wages'], lr: -0.15,
    levels: ['Very low', 'Low', 'Standard', 'High', 'Very high'],
    desc: 'Payroll contributions by employers, workers and autónomos that fund pensions.',
    fx: 'unemployment 0.08, precarity 0.05, investment -0.08, selfEmployed -0.3, workers -0.05, pensioners 0.08' });
  pol({ id: 'wealthTax', cat: 'tax', name: 'Wealth Tax', local: 'Impuesto sobre el Patrimonio', init: 0.5, intro: 20, budget: ['rev', 5, 'gdp'], lr: -0.4,
    levels: ['Token', 'Light', 'Standard', 'Heavy', 'Punitive'],
    desc: 'Annual tax on large fortunes, including the "grandes fortunas" solidarity surcharge.',
    fx: 'inequality -0.05, investment -0.06, wealthy -0.36, lowIncome 0.05, workers 0.04' });
  pol({ id: 'inheritanceTax', cat: 'tax', name: 'Inheritance Tax', local: 'Sucesiones y Donaciones', init: 0.3, intro: 20, budget: ['rev', 10, 'gdp'], lr: -0.25,
    levels: ['Near zero', 'Light', 'Moderate', 'Heavy', 'Very heavy'],
    desc: 'Tax on inheritances. Wildly different between regions: almost abolished in some.',
    fx: 'inequality -0.05, wealthy -0.272, pensioners -0.1, farmers -0.08, catholics -0.04' });
  pol({ id: 'fuelTax', cat: 'tax', name: 'Fuel Tax', local: 'Impuesto de hidrocarburos', init: 0.5, intro: 20, budget: ['rev', 26, 'consumption'], lr: -0.1,
    levels: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Excise duty on petrol and diesel.',
    fx: 'emissions -0.08, inflation 0.04, energy 0.03, everyone -0.09, farmers -0.15, rural -0.12, environmentalists 0.15' });
  pol({ id: 'sinTax', cat: 'tax', name: 'Alcohol & Tobacco Duties', local: 'Impuestos especiales', init: 0.5, intro: 15, budget: ['rev', 18, 'consumption'],
    levels: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Excise duties on drinks and cigarettes.',
    fx: 'health 0.04, crime 0.02, lowIncome -0.05, everyone -0.02' });
  pol({ id: 'touristTax', cat: 'tax', name: 'Tourist Tax', local: 'Tasa turística', init: 0.25, intro: 20, budget: ['rev', 2.5, 'tourism'], lr: -0.1,
    levels: ['Symbolic', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Nightly charge on tourist stays, already levied in Catalonia and the Balearics.',
    fx: 'tourism -0.08, housing -0.03, tourismWorkers -0.2, selfEmployed -0.05, environmentalists 0.05' });
  pol({ id: 'windfallTax', cat: 'tax', name: 'Bank & Energy Windfall Tax', local: 'Impuesto a la banca y energéticas', init: 0.5, intro: 20, budget: ['rev', 6, 'profits'], lr: -0.35,
    levels: ['Light', 'Moderate', 'Standard', 'Heavy', 'Very heavy'],
    desc: 'Temporary levy on the extraordinary profits of banks and energy companies.',
    fx: 'investment -0.06, energy 0.02, inequality -0.02, wealthy -0.1, workers 0.06, lowIncome 0.04' });
  pol({ id: 'carbonTax', cat: 'tax', name: 'Carbon Tax', local: 'Impuesto al carbono', init: null, intro: 35, budget: ['rev', 25, 'gdp'], lr: -0.2,
    levels: ['€20/t', '€40/t', '€60/t', '€80/t', '€100/t'],
    desc: 'Economy-wide tax on CO₂ emissions.',
    fx: 'emissions -0.2, renewables 0.1, energy 0.12, inflation 0.04, growth -0.04, environmentalists 0.35, everyone -0.045, farmers -0.2, selfEmployed -0.1' });
  pol({ id: 'taxFraud', cat: 'tax', popularTax: true, name: 'Tax Fraud Enforcement', local: 'Lucha contra el fraude', init: 0.5, intro: 20, budget: ['rev', 14, 'wages'], lr: -0.1,
    levels: ['Lax', 'Basic', 'Standard', 'Tough', 'Relentless'],
    desc: 'Inspectors at the Agencia Tributaria chasing the shadow economy (~20% of GDP).',
    fx: 'corruption -0.1, workers 0.03, selfEmployed -0.12, wealthy -0.08' });

  // ── Economy & labour ─────────────────────────────────────────
  pol({ id: 'minWage', cat: 'economy', name: 'Minimum Wage', local: 'Salario Mínimo (SMI)', init: 0.55, intro: 25, lr: -0.35,
    fmtLevel: (v) => '€' + Math.round(800 + v * 700) + ' × 14 payments',
    desc: 'The SMI has risen over 60% since 2018. Raising it lifts low pay; too high may cost jobs.',
    fx: 'poverty -0.12, inequality -0.08, precarity -0.03, unemployment 0.07 sq, inflation 0.04, investment -0.06, workers 0.3, lowIncome 0.25, youth 0.08, selfEmployed -0.3' });
  pol({ id: 'workWeek', cat: 'economy', name: 'Working Week', local: 'Jornada laboral', init: 0, intro: 35, budget: ['spend', 3, 'gdp'], lr: -0.3,
    fmtLevel: (v) => (40 - v * 5).toFixed(1) + ' hours',
    desc: 'Legal maximum working week. Unions push for 37.5 hours without pay cuts; employers resist.',
    fx: 'productivity 0.05 sqrt, growth -0.05, unemployment -0.02, birthrate 0.02, investment -0.08, workers 0.25, parents 0.1, selfEmployed -0.3' });
  pol({ id: 'labourProtection', cat: 'economy', name: 'Labour Protection', local: 'Reforma laboral', init: 0.6, intro: 30, lr: -0.3,
    levels: ['Deregulated', 'Flexible', 'Balanced', 'Protective', 'Rigid'],
    desc: 'Firing costs, limits on temporary contracts and collective bargaining.',
    fx: 'precarity -0.2, unemployment 0.04, growth -0.03, investment -0.08, workers 0.2, youth 0.05, selfEmployed -0.2' });
  pol({ id: 'industrialPolicy', cat: 'economy', name: 'Industrial Strategy', local: 'Política industrial (PERTE)', init: 0.4, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.1,
    levels: ['Minimal', 'Targeted', 'Active', 'Ambitious', 'State-led'],
    desc: 'Subsidies for chips, batteries, green hydrogen and car plants.',
    fx: 'productivity 0.08, unemployment -0.04, growth 0.04, investment 0.05, workers 0.1' });
  pol({ id: 'rnd', cat: 'economy', name: 'R&D Funding', local: 'I+D+i', init: 0.4, intro: 25, budget: ['spend', 20, 'gdp'],
    levels: ['Starved', 'Low', 'Average', 'High', 'World-class'],
    desc: 'Public research funding. Spain spends well below the EU average.',
    fx: 'productivity 0.2 sqrt, growth 0.04, education 0.03, investment 0.05, youth 0.08' });
  pol({ id: 'smeSupport', cat: 'economy', name: 'Autónomo Support', local: 'Tarifa plana y ayudas a pymes', init: 0.5, intro: 20, budget: ['spend', 6, 'gdp'], lr: 0.1,
    levels: ['None', 'Basic', 'Moderate', 'Generous', 'Lavish'],
    desc: 'Flat-rate contributions for new self-employed, cheap ICO loans and grants for small firms.',
    fx: 'unemployment -0.04, investment 0.05, selfEmployed 0.3, youth 0.04' });
  pol({ id: 'farmSubsidy', cat: 'economy', name: 'Farm Subsidies', local: 'Ayudas al campo (PAC)', init: 0.5, intro: 20, budget: ['spend', 14, 'gdp'], lr: 0.05,
    levels: ['EU minimum', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'National top-up of EU Common Agricultural Policy payments.',
    fx: 'depopulation -0.06, water 0.06, emissions 0.03, farmers 0.45, rural 0.15, environmentalists -0.06' });
  pol({ id: 'tourismPromo', cat: 'economy', name: 'Tourism Promotion', local: 'Turespaña', init: 0.5, intro: 15, budget: ['spend', 0.4, 'gdp'], lr: 0.05,
    levels: ['None', 'Low', 'Moderate', 'High', 'Aggressive'],
    desc: 'Marketing Spain abroad and supporting the hospitality sector.',
    fx: 'tourism 0.12, housing 0.04, unemployment -0.03, tourismWorkers 0.2, environmentalists -0.06, tenants -0.04' });
  pol({ id: 'publicEnergy', cat: 'economy', name: 'Public Energy Company', local: 'Empresa pública de energía', init: null, intro: 45, budget: ['spend', 6, 'gdp'], lr: -0.5,
    levels: ['Small', 'Modest', 'Significant', 'Major', 'Dominant'],
    desc: 'A state-owned utility to compete with the big electricity companies.',
    fx: 'energy -0.08, investment -0.08, renewables 0.04, workers 0.1, lowIncome 0.06, wealthy -0.1, environmentalists 0.05' });

  // ── Welfare ──────────────────────────────────────────────────
  pol({ id: 'pensions', cat: 'welfare', name: 'Pension Indexation', local: 'Revalorización de pensiones', init: 0.65, intro: 40, budget: ['spend', 300, 'ageing'], lr: -0.15,
    fmtLevel: (v) => (v < 0.15 ? 'Frozen' : v < 0.45 ? 'Below inflation' : v < 0.8 ? 'Indexed to CPI' : 'Above inflation'),
    desc: 'Pensions are the biggest item of public spending. Freezing them is political suicide; generosity strains the budget as boomers retire.',
    fx: 'poverty -0.08, growth 0.02, pensioners 0.55, youth -0.05, wealthy -0.04' });
  pol({ id: 'retirementAge', cat: 'welfare', name: 'Retirement Age', local: 'Edad de jubilación', init: 0.6, intro: 40, budget: ['spend', -32, 'ageing'], lr: 0.2,
    fmtLevel: (v) => (63 + v * 6).toFixed(1) + ' years',
    desc: 'Statutory pension age (being raised to 67). Higher saves money but enrages workers and near-retirees.',
    fx: 'unemployment 0.02, growth 0.02, pensioners -0.25, workers -0.25, youth -0.05' });
  pol({ id: 'unemploymentBenefit', cat: 'welfare', name: 'Unemployment Benefits', local: 'Prestación por desempleo', init: 0.55, intro: 25, budget: ['spend', 42, 'unemp'], lr: -0.2,
    levels: ['Minimal', 'Basic', 'Moderate', 'Generous', 'Very generous'],
    desc: 'Payments to people who have lost their jobs.',
    fx: 'poverty -0.1, unemployment 0.03, precarity -0.02, unemployed 0.5, workers 0.08, selfEmployed -0.06' });
  pol({ id: 'minimumIncome', cat: 'welfare', name: 'Minimum Income', local: 'Ingreso Mínimo Vital', init: 0.4, intro: 30, budget: ['spend', 11, 'gdp'], lr: -0.35,
    levels: ['Minimal', 'Basic', 'Moderate', 'Generous', 'Universal'],
    desc: 'Guaranteed income for the poorest households, introduced in 2020.',
    fx: 'poverty -0.2 sqrt, inequality -0.08, crime -0.04, unemployment 0.02, lowIncome 0.3, unemployed 0.1, selfEmployed -0.06, wealthy -0.04' });
  pol({ id: 'childBenefit', cat: 'welfare', name: 'Child Benefit', local: 'Prestación por hijo / cheque bebé', init: 0.25, intro: 25, budget: ['spend', 16, 'gdp'], lr: -0.05,
    levels: ['Minimal', 'Basic', 'Moderate', 'Generous', 'Very generous'],
    desc: 'Cash support for families with children, aimed at Spain\'s collapsing birth rate.',
    fx: 'birthrate 0.18, poverty -0.05, parents 0.35, catholics 0.08' });
  pol({ id: 'longTermCare', cat: 'welfare', name: 'Long-term Care', local: 'Ley de Dependencia', init: 0.45, intro: 25, budget: ['spend', 22, 'ageing'], lr: -0.15,
    levels: ['Minimal', 'Basic', 'Moderate', 'Generous', 'Universal'],
    desc: 'Care for the elderly and dependent. Waiting lists are notorious.',
    fx: 'health 0.04, gender 0.04, unemployment -0.02, pensioners 0.15, feminists 0.08, publicSector 0.04' });
  pol({ id: 'parentalLeave', cat: 'welfare', name: 'Parental Leave', local: 'Permiso por nacimiento', init: 0.55, intro: 20, budget: ['spend', 7, 'gdp'], lr: -0.15,
    fmtLevel: (v) => Math.round(8 + v * 24) + ' weeks per parent',
    desc: 'Paid, equal and non-transferable leave for both parents.',
    fx: 'birthrate 0.06, gender 0.1, parents 0.25, feminists 0.15, selfEmployed -0.08' });

  // ── Public services ──────────────────────────────────────────
  pol({ id: 'healthcare', cat: 'services', name: 'Public Healthcare', local: 'Sanidad pública', init: 0.6, intro: 30, budget: ['spend', 172, 'ageing'], lr: -0.1,
    levels: ['Bare bones', 'Underfunded', 'Adequate', 'Well funded', 'Excellent'],
    desc: 'Universal health system, run by the regions, funded centrally.',
    fx: 'health 0.5 sqrt, pensioners 0.15, everyone 0.06, publicSector 0.08, lowIncome 0.08' });
  pol({ id: 'healthOutsourcing', cat: 'services', name: 'Healthcare Outsourcing', local: 'Conciertos sanitarios', init: 0.3, intro: 25, budget: ['spend', -6, 'gdp'], lr: 0.35,
    levels: ['None', 'Limited', 'Moderate', 'Extensive', 'Widespread'],
    desc: 'Contracting private hospitals and insurers (like MUFACE) to deliver public care.',
    fx: 'health 0.08, corruption 0.04, wealthy 0.08, publicSector -0.15, workers -0.05' });
  pol({ id: 'education', cat: 'services', name: 'Public Education', local: 'Educación pública', init: 0.55, intro: 30, budget: ['spend', 120, 'gdp'], lr: -0.1,
    levels: ['Bare bones', 'Underfunded', 'Adequate', 'Well funded', 'Excellent'],
    desc: 'Schools and universities. Spain has high early school-leaving rates.',
    fx: 'education 0.45 sqrt, productivity 0.06, inequality -0.04, parents 0.2, youth 0.1, publicSector 0.08' });
  pol({ id: 'charterSchools', cat: 'services', name: 'Subsidised Private Schools', local: 'Escuela concertada', init: 0.5, intro: 25, budget: ['spend', 14, 'gdp'], lr: 0.3,
    levels: ['Phased out', 'Reduced', 'Current', 'Expanded', 'Dominant'],
    desc: 'State-funded, mostly Catholic, schools that educate a quarter of Spanish children.',
    fx: 'education 0.03, inequality 0.04, catholics 0.3, parents 0.05, secular -0.15' });
  pol({ id: 'grants', cat: 'services', name: 'Student Grants', local: 'Becas', init: 0.45, intro: 15, budget: ['spend', 5, 'gdp'], lr: -0.15,
    levels: ['Minimal', 'Basic', 'Moderate', 'Generous', 'Free university'],
    desc: 'Grants for students from poorer families.',
    fx: 'education 0.08, inequality -0.04, productivity 0.03, youth 0.2' });
  pol({ id: 'civilService', cat: 'services', name: 'Civil Service Size', local: 'Empleo público', init: 0.55, intro: 25, budget: ['spend', 50, 'gdp'], lr: -0.15,
    levels: ['Lean', 'Small', 'Moderate', 'Large', 'Very large'],
    desc: 'Number of public employees and their pay.',
    fx: 'unemployment -0.06, health 0.04, education 0.04, crime -0.02, corruption 0.02, publicSector 0.3, selfEmployed -0.1' });
  pol({ id: 'publicTransport', cat: 'services', name: 'Public Transport', local: 'Cercanías y abono transporte', init: 0.5, intro: 20, budget: ['spend', 10, 'gdp'], lr: -0.1,
    levels: ['Minimal', 'Basic', 'Good', 'Subsidised', 'Free'],
    desc: 'Commuter rail, buses and discounted travel passes.',
    fx: 'emissions -0.06, inequality -0.02, youth 0.08, workers 0.05, everyone 0.009, rural 0.03, environmentalists 0.1' });
  pol({ id: 'infrastructureInv', cat: 'services', name: 'Rail & Roads', local: 'AVE y obra pública', init: 0.55, intro: 25, budget: ['spend', 24, 'gdp'],
    levels: ['Maintenance', 'Low', 'Moderate', 'High', 'Massive'],
    desc: 'High-speed rail, motorways and the Mediterranean rail corridor.',
    fx: 'infrastructure 0.3, growth 0.03, tourism 0.04, depopulation -0.04, unemployment -0.02, emissions -0.02, corruption 0.03, rural 0.08' });
  pol({ id: 'broadband', cat: 'services', name: 'Rural Broadband', local: 'Conectividad rural', init: 0.4, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['None', 'Basic', 'Moderate', 'Extensive', 'Universal'],
    desc: 'Fibre and 5G for small towns, to make remote work possible in the interior.',
    fx: 'productivity 0.05, depopulation -0.06, infrastructure 0.04, rural 0.12, youth 0.04' });

  // ── Law & order ──────────────────────────────────────────────
  pol({ id: 'police', cat: 'law', name: 'Police & Guardia Civil', local: 'Policía y Guardia Civil', init: 0.5, intro: 25, budget: ['spend', 24, 'gdp'], lr: 0.15,
    levels: ['Skeleton', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'National Police and Guardia Civil staffing and equipment.',
    fx: 'crime -0.25 sqrt, liberty -0.04, patriots 0.15, pensioners 0.08, catholics 0.04, publicSector 0.03' });
  pol({ id: 'securityLaw', cat: 'law', name: 'Public Security Law', local: 'Ley de Seguridad Ciudadana', init: 0.5, intro: 25, budget: ['rev', 0.3, 'gdp'], lr: 0.35, cen: 0.1,
    levels: ['Repealed', 'Softened', 'Current', 'Tougher', 'Draconian'],
    desc: 'Fines for protests and "disrespecting" police. Critics call it the "gag law" (ley mordaza).',
    fx: 'crime -0.04, liberty -0.25, tension 0.03, patriots 0.15, pensioners 0.06, youth -0.12, secular -0.1' });
  pol({ id: 'justice', cat: 'law', name: 'Justice System', local: 'Medios judiciales', init: 0.4, intro: 20, budget: ['spend', 9, 'gdp'],
    levels: ['Starved', 'Slow', 'Adequate', 'Efficient', 'Excellent'],
    desc: 'Judges, courts and digitalisation. Spanish justice is notoriously slow.',
    fx: 'corruption -0.15, crime -0.06, liberty 0.05, everyone 0.02, selfEmployed 0.04' });
  pol({ id: 'antiCorruption', cat: 'law', name: 'Anti-Corruption Office', local: 'Oficina Anticorrupción', init: 0.4, intro: 25, budget: ['spend', 1.5, 'gdp'],
    levels: ['Toothless', 'Weak', 'Moderate', 'Strong', 'Fearless'],
    desc: 'Independent investigators and transparency rules for parties and public contracts.',
    fx: 'corruption -0.25 sqrt, investment 0.04, everyone 0.03' });
  pol({ id: 'defence', cat: 'law', name: 'Defence Spending', local: 'Defensa', init: 0.42, intro: 30, budget: ['spend', 50, 'gdp'], lr: 0.25, cen: 0.1,
    fmtLevel: (v) => (v * 3).toFixed(1) + '% of GDP',
    desc: 'NATO allies press Spain, among the lowest spenders, to reach 2% of GDP and beyond.',
    fx: 'productivity 0.02, unemployment -0.01, patriots 0.25, catholics 0.03, environmentalists -0.05, secular -0.03' });
  pol({ id: 'borderControl', cat: 'law', name: 'Border Control', local: 'Control fronterizo', init: 0.5, intro: 25, budget: ['spend', 4, 'gdp'], lr: 0.35, cen: 0.1,
    levels: ['Open', 'Light', 'Moderate', 'Strict', 'Fortress'],
    desc: 'Patrols in the Strait and Canaries route, and the fences at Ceuta and Melilla.',
    fx: 'immigration -0.2, liberty -0.04, crime -0.02, patriots 0.25, immigrants -0.3' });
  pol({ id: 'regularisation', cat: 'law', name: 'Migrant Regularisation', local: 'Regularización extraordinaria', init: null, intro: 35, budget: ['rev', 4, 'wages'], lr: -0.4,
    levels: ['Narrow', 'Limited', 'Broad', 'Wide', 'Universal'],
    desc: 'Give legal status to undocumented migrants already living and working in Spain.',
    fx: 'immigration 0.06, poverty -0.04, growth 0.02, crime -0.02, immigrants 0.4, patriots -0.25, workers -0.03' });
  pol({ id: 'integration', cat: 'law', name: 'Integration Programmes', local: 'Integración', init: 0.4, intro: 15, budget: ['spend', 2, 'gdp'], lr: -0.15,
    levels: ['None', 'Basic', 'Moderate', 'Strong', 'Comprehensive'],
    desc: 'Language classes, job placement and reception centres.',
    fx: 'crime -0.04, poverty -0.02, immigrants 0.2, patriots -0.04' });
  pol({ id: 'cannabis', cat: 'law', name: 'Cannabis Legalisation', local: 'Legalización del cannabis', init: null, intro: 30, budget: ['rev', 1.5, 'gdp'], lr: -0.3,
    levels: ['Medical only', 'Clubs', 'Decriminalised', 'Legal retail', 'Fully liberal'],
    desc: 'Regulate cannabis, building on Spain\'s tolerated cannabis clubs.',
    fx: 'crime -0.04, health -0.02, liberty 0.06, youth 0.15, catholics -0.2, pensioners -0.1, patriots -0.06' });

  // ── Territory ────────────────────────────────────────────────
  pol({ id: 'regionalFunding', cat: 'territory', name: 'Regional Financing', local: 'Financiación autonómica', init: 0.5, intro: 30, budget: ['spend', 30, 'gdp'], cen: -0.1,
    levels: ['Stingy', 'Tight', 'Current', 'Generous', 'Very generous'],
    desc: 'Transfers to the 17 autonomous communities, which run health and education.',
    fx: 'health 0.06, education 0.06, tension -0.06, catalanNat 0.1, rural 0.06, patriots -0.03' });
  pol({ id: 'catalanFiscal', cat: 'territory', name: 'Catalan Fiscal Autonomy', local: 'Financiación singular', init: null, intro: 45, budget: ['spend', 12, 'gdp'], cen: -0.6,
    levels: ['Limited', 'Partial', 'Substantial', 'Extensive', 'Basque-style'],
    desc: 'Let Catalonia collect its own taxes, like the Basque Country and Navarre already do.',
    fx: 'tension -0.25, catalanNat 0.45, patriots -0.4, rural -0.1, lowIncome -0.04' });
  pol({ id: 'dialogue', cat: 'territory', name: 'Territorial Dialogue', local: 'Diálogo y medidas de gracia', init: 0.5, intro: 30, budget: ['spend', 0.05, 'gdp'], cen: -0.5,
    levels: ['Confrontation', 'Cold', 'Negotiation', 'Pardons', 'Full amnesty'],
    desc: 'Negotiation tables, pardons and amnesty for those involved in the 2017 independence push.',
    fx: 'tension -0.15, catalanNat 0.3, basqueNat 0.1, patriots -0.4, catholics -0.05' });
  pol({ id: 'languages', cat: 'territory', name: 'Co-official Languages', local: 'Lenguas cooficiales', init: 0.5, intro: 20, budget: ['spend', 1, 'gdp'], cen: -0.35,
    levels: ['Castilian only', 'Tolerated', 'Promoted', 'Prioritised', 'Equal status'],
    desc: 'Promotion of Catalan, Basque and Galician in parliament, schools and the EU.',
    fx: 'tension -0.05, catalanNat 0.2, basqueNat 0.2, patriots -0.2' });
  pol({ id: 'recentralisation', cat: 'territory', name: 'Central Oversight', local: 'Recentralización (Art. 155)', init: null, intro: 50, budget: ['spend', 1, 'gdp'], lr: 0.3, cen: 0.8,
    levels: ['Warnings', 'Audits', 'Intervention', 'Direct rule', 'Suspended autonomy'],
    desc: 'Central control over rebellious regional governments, as in 2017 when Catalan autonomy was suspended.',
    fx: 'tension 0.2, liberty -0.08, investment 0.02, patriots 0.45, catalanNat -0.6, basqueNat -0.35' });
  pol({ id: 'ruralPlan', cat: 'territory', name: 'Rural Revitalisation', local: 'Reto demográfico', init: 0.3, intro: 20, budget: ['spend', 6, 'gdp'],
    levels: ['Token', 'Small', 'Moderate', 'Major', 'Marshall Plan'],
    desc: 'Tax breaks, services and housing to repopulate the interior.',
    fx: 'depopulation -0.2 sqrt, birthrate 0.02, rural 0.3, farmers 0.08' });
  pol({ id: 'monarchy', cat: 'territory', name: 'Royal Household Budget', local: 'Casa Real', init: 0.5, intro: 30, budget: ['spend', 0.017, 'gdp'], lr: 0.15, cen: 0.2,
    levels: ['Austere', 'Lean', 'Current', 'Generous', 'Lavish'],
    desc: 'Funding and visibility of the Crown. A symbolic budget line with real political weight.',
    fx: 'patriots 0.12, catholics 0.05, secular -0.06, catalanNat -0.05, basqueNat -0.05' });

  // ── Environment & energy ─────────────────────────────────────
  pol({ id: 'renewableSubsidy', cat: 'environment', name: 'Renewables Programme', local: 'Plan de renovables', init: 0.55, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.1,
    levels: ['None', 'Low', 'Moderate', 'High', 'Maximum'],
    desc: 'Auctions, grid investment and storage for solar and wind.',
    fx: 'renewables 0.3 sqrt, emissions -0.12, energy -0.06, investment 0.03, unemployment -0.02, environmentalists 0.25, rural 0.04' });
  pol({ id: 'nuclearPhaseout', cat: 'environment', name: 'Nuclear Phase-out', local: 'Cierre nuclear', init: 0.6, intro: 30, budget: ['spend', 1.2, 'gdp'], lr: -0.15,
    levels: ['Extend plants', 'Slow', 'Planned (2035)', 'Accelerated', 'Immediate'],
    desc: 'Spain plans to close its seven reactors by 2035. The 2025 blackout reopened the debate.',
    fx: 'energy 0.08, emissions 0.06, growth -0.02, investment -0.04, environmentalists 0.15' });
  pol({ id: 'waterInfra', cat: 'environment', name: 'Water Infrastructure', local: 'Desaladoras y trasvases', init: 0.4, intro: 25, budget: ['spend', 5, 'gdp'],
    levels: ['Minimal', 'Basic', 'Moderate', 'Major', 'Massive'],
    desc: 'Desalination plants, pipelines and water transfers between river basins.',
    fx: 'water -0.25 sqrt, energy 0.02, tourism 0.02, farmers 0.2, environmentalists -0.04' });
  pol({ id: 'irrigationLimits', cat: 'environment', name: 'Irrigation Limits', local: 'Límites al regadío', init: null, intro: 30, budget: ['spend', 1.2, 'gdp'], lr: -0.1,
    levels: ['Advisory', 'Light', 'Moderate', 'Strict', 'Severe'],
    desc: 'Cap water use by farms, which consume ~80% of Spain\'s water. Protects aquifers like Doñana.',
    fx: 'water -0.2, growth -0.02, farmers -0.4, rural -0.15, environmentalists 0.25' });
  pol({ id: 'evSubsidy', availableFrom: 2010, cat: 'environment', name: 'EV Subsidies', local: 'Plan MOVES', init: 0.3, intro: 15, budget: ['spend', 5, 'gdp'],
    levels: ['None', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Grants for electric cars and charging points.',
    fx: 'emissions -0.05, productivity 0.02, everyone 0.024, wealthy 0.05, environmentalists 0.1' });
  pol({ id: 'lowEmissionZones', cat: 'environment', name: 'Low Emission Zones', local: 'Zonas de bajas emisiones', init: 0.4, intro: 20, budget: ['spend', 0.5, 'gdp'], lr: -0.2,
    levels: ['None', 'Symbolic', 'Moderate', 'Strict', 'Car-free centres'],
    desc: 'Ban older cars from city centres, as in Madrid and Barcelona.',
    fx: 'emissions -0.06, health 0.03, everyone -0.075, selfEmployed -0.08, rural -0.03, environmentalists 0.2' });
  pol({ id: 'wildfirePrevention', cat: 'environment', name: 'Wildfire Prevention', local: 'Prevención de incendios', init: 0.35, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['Minimal', 'Basic', 'Moderate', 'Strong', 'Comprehensive'],
    desc: 'Year-round firefighters, forest clearing and rural land management. Reduces wildfire risk.',
    fx: 'emissions -0.03, water -0.02, depopulation -0.02, rural 0.12, environmentalists 0.1' });
  pol({ id: 'tolls', cat: 'environment', name: 'Motorway Tolls', local: 'Peajes en autovías', init: null, intro: 30, budget: ['rev', 8, 'gdp'], lr: -0.05,
    levels: ['Trucks only', 'Low', 'Moderate', 'High', 'Very high'],
    desc: 'Charge for using motorways, as Brussels has urged.',
    fx: 'emissions -0.03, infrastructure 0.08, everyone -0.105, rural -0.08, environmentalists 0.05' });

  // ── Housing & society ────────────────────────────────────────
  pol({ id: 'publicHousing', cat: 'society', name: 'Public Housing', local: 'Vivienda pública', init: 0.3, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.2,
    levels: ['Minimal', 'Small', 'Moderate', 'Large', 'Vienna-style'],
    desc: 'Social housing is just 2% of the stock in Spain, versus 20%+ in parts of Europe.',
    fx: 'housing -0.15 sqrt, inequality -0.03, unemployment -0.02, birthrate 0.02, tenants 0.25, youth 0.2, wealthy -0.06' });
  pol({ id: 'rentControl', cat: 'society', name: 'Rent Control', local: 'Control del alquiler', init: 0.35, intro: 30, lr: -0.4,
    levels: ['None', 'Light', 'Stressed areas', 'Strict', 'Rent freeze'],
    desc: 'Caps on rent rises in "stressed" areas under the 2023 Housing Law.',
    fx: 'housing -0.12, investment -0.05, tenants 0.35, youth 0.1, wealthy -0.32' });
  pol({ id: 'touristFlats', cat: 'society', name: 'Tourist Rental Limits', local: 'Límites a pisos turísticos', init: 0.35, intro: 25, budget: ['spend', 0.05, 'gdp'], lr: -0.2,
    levels: ['Unregulated', 'Registry', 'Licences', 'Strict caps', 'Ban'],
    desc: 'Limit short-term holiday lets that push residents out of city centres.',
    fx: 'housing -0.1, tourism -0.04, tenants 0.2, youth 0.06, wealthy -0.15, tourismWorkers -0.06' });
  pol({ id: 'goldenVisa', cat: 'society', name: 'Golden Visa', local: 'Visado de oro', init: null, intro: 20, lr: 0.3,
    levels: ['€1M+', '€750k', '€500k', '€350k', '€250k'],
    desc: 'Residency for foreigners buying property. Abolished in 2025; could be revived.',
    fx: 'housing 0.06, investment 0.06, corruption 0.03, wealthy 0.1, tenants -0.15' });
  pol({ id: 'firstHome', cat: 'society', name: 'First-Home Guarantees', local: 'Avales ICO para jóvenes', init: 0.3, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['None', 'Small', 'Moderate', 'Large', 'Universal'],
    desc: 'State guarantees so young people can buy with a small deposit.',
    fx: 'housing 0.03, birthrate 0.02, youth 0.12, parents 0.06, wealthy 0.024' });
  pol({ id: 'genderEquality', cat: 'society', name: 'Equality & Anti-violence', local: 'Igualdad y violencia de género', init: 0.6, intro: 20, budget: ['spend', 2, 'gdp'], lr: -0.25,
    levels: ['Minimal', 'Basic', 'Strong', 'Very strong', 'Maximum'],
    desc: 'Gender violence courts, quotas and equal-pay enforcement.',
    fx: 'gender 0.25 sqrt, crime -0.02, feminists 0.4, catholics -0.08, patriots -0.1' });
  pol({ id: 'churchFunding', cat: 'society', name: 'Church Funding', local: 'Financiación de la Iglesia', init: 0.5, intro: 25, budget: ['spend', 0.7, 'gdp'], lr: 0.3,
    levels: ['None', 'Reduced', 'Current (0.7% box)', 'Increased', 'Generous'],
    desc: 'Taxpayers can tick a box to give 0.7% of their income tax to the Catholic Church.',
    fx: 'catholics 0.35, secular -0.25' });
  pol({ id: 'bullfighting', cat: 'society', name: 'Bullfighting Protection', local: 'Tauromaquia', init: 0.5, intro: 20, budget: ['spend', 0.1, 'gdp'], lr: 0.3, cen: 0.2,
    levels: ['Banned', 'Restricted', 'Tolerated', 'Protected heritage', 'Subsidised'],
    desc: 'La corrida: cultural heritage to some, animal cruelty to others. Banned in Catalonia 2010–2016.',
    fx: 'tourism 0.01, bullfighting 0.5, rural 0.04, patriots 0.1, environmentalists -0.2, catalanNat -0.05' });
  pol({ id: 'animalWelfare', cat: 'society', name: 'Animal Welfare Law', local: 'Ley de Bienestar Animal', init: 0.5, intro: 20, budget: ['spend', 0.15, 'gdp'], lr: -0.2,
    levels: ['Weak', 'Basic', 'Current', 'Strong', 'Very strong'],
    desc: 'Rules for pets, breeding and hunting dogs.',
    fx: 'environmentalists 0.25, farmers -0.15, bullfighting -0.15, rural -0.08' });
  pol({ id: 'euthanasia', cat: 'society', name: 'Euthanasia Law', local: 'Ley de Eutanasia', init: 0.5, intro: 25, budget: ['spend', 0.05, 'gdp'], lr: -0.25,
    levels: ['Repealed', 'Very restricted', 'Current', 'Broader', 'Liberal'],
    desc: 'Assisted dying, legal since 2021.',
    fx: 'liberty 0.05, catholics -0.25, secular 0.2, pensioners -0.02' });
  pol({ id: 'memoryLaw', cat: 'society', name: 'Democratic Memory', local: 'Memoria democrática', init: 0.5, intro: 20, budget: ['spend', 0.06, 'gdp'], lr: -0.3,
    levels: ['Repealed', 'Minimal', 'Current', 'Expanded', 'Truth commission'],
    desc: 'Exhuming victims of the Civil War and Franco dictatorship, removing Francoist symbols.',
    fx: 'secular 0.1, catalanNat 0.04, basqueNat 0.04, patriots -0.2, catholics -0.06' });

  // ── Added policies ───────────────────────────────────────────
  pol({ id: 'emptyHomesTax', cat: 'tax', name: 'Empty Homes Tax', local: 'Impuesto a viviendas vacías', init: null, intro: 25, budget: ['rev', 2, 'gdp'], lr: -0.25,
    levels: ['Token', 'Light', 'Moderate', 'Heavy', 'Punitive'],
    desc: 'Spain has nearly 4 million empty homes. Tax them to push owners to rent or sell.',
    fx: 'housing -0.05, tenants 0.1, youth 0.03, wealthy -0.12' });
  pol({ id: 'foreignBuyers', cat: 'society', name: 'Tax on Non-EU Home Buyers', local: 'Impuesto a compradores extracomunitarios', init: null, intro: 25, budget: ['rev', 1.5, 'gdp'], lr: -0.1, cen: 0.05,
    levels: ['10%', '25%', '50%', '75%', '100%'],
    desc: 'A surcharge on homes bought by non-resident foreigners outside the EU, who buy a large share of coastal property.',
    fx: 'housing -0.05, investment -0.03, tenants 0.1, wealthy -0.06, tourismWorkers -0.03' });
  pol({ id: 'landReform', cat: 'society', name: 'Land & Planning Reform', local: 'Ley del Suelo', init: 0.4, intro: 30, lr: 0.15,
    levels: ['Very restrictive', 'Restrictive', 'Balanced', 'Permissive', 'Build anywhere'],
    desc: 'How easy it is to rezone land and build. More supply lowers prices over time, but at a cost to the landscape, and it invites corruption.',
    fx: 'housing -0.14, investment 0.04, unemployment -0.02, corruption 0.04, emissions 0.02, environmentalists -0.12, wealthy 0.05, tenants 0.05' });
  pol({ id: 'aiStrategy', availableFrom: 2023, cat: 'economy', name: 'AI & Digital Strategy', local: 'Estrategia de IA', init: 0.3, intro: 20, budget: ['spend', 4, 'gdp'],
    levels: ['None', 'Basic', 'Moderate', 'Ambitious', 'World-leading'],
    desc: 'Public supercomputing, AI research and digital skills, so Spain gains from automation instead of just losing jobs to it.',
    fx: 'productivity 0.1 sqrt, investment 0.04, unemployment 0.01, youth 0.05, workers -0.03' });
  pol({ id: 'retraining', cat: 'economy', name: 'Job Retraining', local: 'FP dual y formación para el empleo', init: 0.4, intro: 20, budget: ['spend', 8, 'gdp'], lr: -0.05,
    levels: ['Minimal', 'Basic', 'Moderate', 'Extensive', 'Universal'],
    desc: 'Vocational training and retraining for the unemployed and workers displaced by automation.',
    fx: 'unemployment -0.06, precarity -0.04, productivity 0.04, unemployed 0.15, workers 0.05, youth 0.06' });
  pol({ id: 'freeTrade', cat: 'economy', name: 'Free-Trade Agreements', local: 'Acuerdo UE-Mercosur', init: 0.5, intro: 25, lr: 0.15,
    levels: ['Protectionist', 'Cautious', 'Supportive', 'Champion', 'Unconditional'],
    desc: 'Spain\'s stance on EU trade deals like Mercosur: good for exporters and consumers, feared by farmers.',
    fx: 'growth 0.04, investment 0.04, inflation -0.02, farmers -0.25, rural -0.05, selfEmployed 0.04, workers -0.02' });
  pol({ id: 'childcare', cat: 'welfare', name: 'Free Childcare (0–3)', local: 'Escuelas infantiles gratuitas', init: 0.3, intro: 20, budget: ['spend', 8, 'gdp'], lr: -0.1,
    levels: ['Minimal', 'Patchy', 'Moderate', 'Wide', 'Universal'],
    desc: 'Free nursery places for children under three, so parents (mostly mothers) can keep working.',
    fx: 'birthrate 0.07, gender 0.06, unemployment -0.02, education 0.02, parents 0.25, feminists 0.06' });
  pol({ id: 'energyBonus', cat: 'welfare', name: 'Energy Bill Support', local: 'Bono social eléctrico', init: 0.4, intro: 15, budget: ['spend', 6, 'gdp'], lr: -0.1,
    levels: ['None', 'Targeted', 'Moderate', 'Broad', 'Universal'],
    desc: 'Discounts on electricity bills for vulnerable households and VAT cuts on power.',
    fx: 'poverty -0.04, inflation -0.02, emissions 0.02, lowIncome 0.12, everyone 0.03, environmentalists -0.03' });
  pol({ id: 'dentalCare', cat: 'services', name: 'Public Dental Care', local: 'Dentista público', init: null, intro: 25, budget: ['spend', 4, 'gdp'], lr: -0.15,
    levels: ['Children only', 'Basic', 'Moderate', 'Broad', 'Full coverage'],
    desc: 'Bring dentistry, almost entirely private in Spain, into the public health system.',
    fx: 'health 0.04, lowIncome 0.12, pensioners 0.08, everyone 0.02' });
  pol({ id: 'remoteWork', availableFrom: 2020, cat: 'territory', name: 'Remote-Work Relocation', local: 'Teletrabajo rural', init: null, intro: 15, budget: ['spend', 1.5, 'gdp'],
    levels: ['Pilot', 'Small', 'Moderate', 'Large', 'National'],
    desc: 'Grants and tax breaks for remote workers who move to small towns.',
    fx: 'depopulation -0.06, productivity 0.01, rural 0.1, youth 0.03' });
  pol({ id: 'selfDetermination', cat: 'territory', name: 'Agreed Independence Referendum', local: 'Referéndum pactado', init: null, intro: 60, budget: ['spend', 0.3, 'gdp'], lr: -0.1, cen: -0.9,
    levels: ['Consultative', 'Consultative+', 'Binding (high bar)', 'Binding', 'Binding (simple majority)'],
    desc: 'A legal, agreed vote on Catalan independence, as the UK did for Scotland. Defuses tension but horrifies much of Spain.',
    fx: 'tension -0.35, investment -0.05, catalanNat 0.6, basqueNat 0.15, patriots -0.6, everyone -0.04, catholics -0.05' });
  pol({ id: 'greenHydrogen', availableFrom: 2020, cat: 'environment', name: 'Green Hydrogen & Storage', local: 'Hidrógeno verde y baterías', init: 0.2, intro: 25, budget: ['spend', 6, 'gdp'],
    levels: ['Pilots', 'Small', 'Moderate', 'Large', 'Massive'],
    desc: 'Batteries, pumped hydro and hydrogen to store solar power, stabilise the grid and reduce blackout risk.',
    fx: 'renewables 0.08, energy -0.05, investment 0.05, emissions -0.04, unemployment -0.01, environmentalists 0.08' });

  S.policies = P;

  S.policyCats = {
    tax: { name: 'Taxation', local: 'Fiscalidad', icon: '€' },
    economy: { name: 'Economy & Labour', local: 'Economía y empleo', icon: '⚙' },
    welfare: { name: 'Welfare', local: 'Bienestar social', icon: '♥' },
    services: { name: 'Public Services', local: 'Servicios públicos', icon: '✚' },
    law: { name: 'Law, Order & Defence', local: 'Interior y defensa', icon: '⚖' },
    territory: { name: 'Territory & State', local: 'Modelo territorial', icon: '◈' },
    environment: { name: 'Environment & Energy', local: 'Medio ambiente', icon: '☀' },
    society: { name: 'Housing & Society', local: 'Vivienda y sociedad', icon: '⌂' },
  };

  /* ---------------------------------------------------------------
   * SITUATIONS: persistent states with hysteresis
   * ------------------------------------------------------------- */
  S.situations = [
    { id: 'housingCrisis', name: 'Housing Emergency', local: 'Emergencia habitacional', bad: true,
      trigger: (s) => s.housing, on: 0.66, off: 0.58,
      desc: 'Young people cannot leave home: average age of emancipation is over 30.',
      fx: 'tenants -0.15, youth -0.12, everyone -0.04, birthrate -0.04' },
    { id: 'drought', name: 'Severe Drought', local: 'Sequía extrema', bad: true,
      trigger: (s) => s.water, on: 0.68, off: 0.55,
      desc: 'Reservoirs are critically low. Water restrictions in Catalonia and Andalusia.',
      fx: 'farmers -0.25, rural -0.1, growth -0.03, energy 0.04, tourism -0.02' },
    { id: 'recession', name: 'Recession', local: 'Recesión', bad: true,
      trigger: (s) => s.growth, on: 0.3, off: 0.38, below: true,
      desc: 'The economy is shrinking.',
      fx: 'unemployment 0.06, investment -0.06, poverty 0.04, everyone -0.08' },
    { id: 'boom', name: 'Economic Boom', local: 'Bonanza', bad: false,
      trigger: (s) => s.growth, on: 0.75, off: 0.66,
      desc: 'Growth is roaring, but watch for overheating and a property bubble.',
      fx: 'unemployment -0.02, inflation 0.04, housing 0.03, everyone 0.04' },
    { id: 'massUnemployment', name: 'Lost Generation', local: 'Generación perdida', bad: true,
      trigger: (s) => s.unemployment, on: 0.5, off: 0.42,
      desc: 'Unemployment above 15%. Young graduates emigrate in search of work.',
      fx: 'youth -0.2, crime 0.04, birthrate -0.03, immigration -0.04, productivity -0.02' },
    { id: 'fullEmployment', name: 'Labour Shortage', local: 'Pleno empleo', bad: false,
      trigger: (s) => s.unemployment, on: 0.2, off: 0.25, below: true,
      desc: 'Unemployment is at historic lows. Wages rise and workers are confident.',
      fx: 'workers 0.1, everyone 0.05, inflation 0.03, immigration 0.05' },
    { id: 'independenceCrisis', name: 'Independence Crisis', local: 'Crisis independentista', bad: true,
      trigger: (s) => s.tension, on: 0.72, off: 0.55,
      desc: 'Mass demonstrations in Barcelona; the Generalitat threatens a unilateral referendum.',
      fx: 'investment -0.1, growth -0.03, tourism -0.02, patriots -0.2, catalanNat 0.1' },
    { id: 'debtCrisis', name: 'Sovereign Debt Crisis', local: 'Crisis de deuda', bad: true,
      trigger: (s) => s.riskPremium, on: 0.5, off: 0.33,
      desc: 'The risk premium has exploded. Markets doubt Spain can pay; Brussels demands cuts.',
      fx: 'growth -0.1, investment -0.2, unemployment 0.06, everyone -0.15, wealthy -0.1, pensioners -0.08', capital: -3 },
    { id: 'excessiveDeficit', name: 'EU Deficit Procedure', local: 'Procedimiento de déficit excesivo', bad: true,
      trigger: (s) => s.deficitRatio, on: 0.38, off: 0.3,
      desc: 'Brussels has opened an excessive deficit procedure (deficit above 3% of GDP).',
      fx: 'investment -0.04, riskPremium 0.05', capital: -1 },
    { id: 'overtourism', name: 'Overtourism', local: 'Turismofobia', bad: true,
      trigger: (s) => s.tourism, on: 0.82, off: 0.74,
      desc: 'Residents spray water pistols at tourists in Barcelona and Palma.',
      fx: 'housing 0.04, water 0.03, tenants -0.08, environmentalists -0.1' },
    { id: 'energyCrisis', name: 'Energy Crisis', local: 'Crisis energética', bad: true,
      trigger: (s) => s.energy, on: 0.7, off: 0.58,
      desc: 'Electricity bills have doubled.',
      fx: 'inflation 0.05, growth -0.03, lowIncome -0.1, everyone -0.05' },
    { id: 'crimeWave', name: 'Crime Wave', local: 'Ola de inseguridad', bad: true,
      trigger: (s) => s.crime, on: 0.52, off: 0.42,
      desc: 'Rising thefts and drug-gang violence dominate the news.',
      fx: 'tourism -0.03, everyone -0.05, pensioners -0.08, patriots -0.06' },
    { id: 'demographicWinter', name: 'Demographic Winter', local: 'Invierno demográfico', bad: true,
      trigger: (s) => s.birthrate, on: 0.18, off: 0.26, below: true,
      desc: 'Births have hit record lows. Schools close in the interior.',
      fx: 'depopulation 0.04, growth -0.02, catholics -0.05, parents -0.03' },
    { id: 'innovationHub', name: 'Tech Hub', local: 'Polo tecnológico', bad: false,
      trigger: (s) => s.productivity, on: 0.62, off: 0.54,
      desc: 'Madrid, Barcelona, Málaga and Valencia are attracting startups and talent.',
      fx: 'investment 0.05, growth 0.03, youth 0.08' },
    { id: 'corruptionCulture', name: 'Culture of Corruption', local: 'Corrupción sistémica', bad: true,
      trigger: (s) => s.corruption, on: 0.65, off: 0.52,
      desc: 'Kickbacks on public contracts are a national scandal.',
      fx: 'investment -0.05, everyone -0.08' },
  ];

  /* ---------------------------------------------------------------
   * EVENTS & DILEMMAS
   *   chance(state) -> probability this quarter
   *   fx      : temporary effects "target amount", fade over `turns`
   *   choices : make it a dilemma; each choice has fx / policy / cost / capital
   * ------------------------------------------------------------- */
  S.events = [
    { id: 'wildfires', title: 'Heatwave and wildfires', local: 'Ola de calor e incendios',
      chance: (st) => (st.quarter === 3 ? 0.18 : 0.02) * (0.4 + st.sims.water + (st.sims.climate - 0.5)) * (1.25 - 0.8 * st.pol('wildfirePrevention')),
      why: (st) => [st.pol('wildfirePrevention') < 0.4 && 'Little spending on wildfire prevention', st.sims.water > 0.6 && 'Drought has dried out the forests', st.quarter === 3 && 'Summer'],
      text: 'Temperatures above 45°C. Tens of thousands of hectares burn in Galicia, Castilla y León and Extremadura.',
      fx: 'rural -0.15, environmentalists -0.1, everyone -0.03, emissions 0.03, tourism -0.02', turns: 4 },
    { id: 'dana', title: 'Deadly flash floods (DANA)', local: 'DANA',
      chance: (st) => (st.quarter === 4 ? 0.07 : 0.01) * (0.6 + st.sims.climate),
      text: 'A "cold drop" storm dumps a year\'s rain in hours on the Mediterranean coast. Towns are devastated and people are angry at the authorities\' slow response.',
      choices: [
        { label: 'Massive state aid package', desc: '€10bn reconstruction plan, army deployed.', cost: 10, fx: 'everyone 0.05, infrastructure -0.02', turns: 6 },
        { label: 'Let the regional government lead', desc: 'Respect devolved powers; offer support on request.', fx: 'everyone -0.1, infrastructure -0.05, tension 0.02', turns: 6 },
      ] },
    { id: 'generalStrike', title: 'General strike', local: 'Huelga general',
      chance: (st) => (st.groupHappy.workers < 0.35 ? 0.2 : 0) + (st.pol('labourProtection') < 0.35 ? 0.08 : 0) + (st.pol('retirementAge') > 0.8 ? 0.05 : 0),
      why: (st) => [st.groupHappy.workers < 0.35 && 'Workers are angry with your government', st.pol('labourProtection') < 0.35 && 'You weakened labour protection', st.pol('retirementAge') > 0.8 && 'You raised the retirement age sharply'],
      text: 'The big unions bring the country to a standstill against your labour policies.',
      fx: 'growth -0.03, workers -0.05', turns: 2, capital: -6 },
    { id: 'scandal', title: 'Corruption scandal in your party', local: 'Escándalo de corrupción',
      chance: (st) => (0.015 + st.sims.corruption * 0.06) * (1.3 - 0.8 * st.pol('antiCorruption')),
      why: (st) => [st.sims.corruption > 0.5 && 'Corruption is widespread', st.pol('antiCorruption') < 0.35 && 'The Anti-Corruption Office is weak'],
      text: 'Police raid the home of a minister. Leaked recordings suggest kickbacks on pandemic-era mask contracts.',
      choices: [
        { label: 'Force the minister to resign', desc: 'Painful, but shows zero tolerance.', capital: -10, fx: 'corruption -0.02, everyone -0.03', turns: 4 },
        { label: 'Defend them as innocent', desc: 'Keep the cabinet intact and blame "lawfare".', fx: 'corruption 0.04, everyone -0.12', turns: 8 },
      ] },
    { id: 'cayucos', title: 'Migrant boats reach the Canaries', local: 'Crisis de los cayucos',
      chance: (st) => (0.02 + st.sims.migrationPressure * 0.08) * (1.6 - 1.2 * st.pol('borderControl')),
      why: (st) => [st.pol('borderControl') < 0.4 && 'Your border control budget is low', st.sims.migrationPressure > 0.58 && 'Migration pressure from the Sahel is high'],
      text: 'Thousands of people arrive on the Atlantic route in a single week. Reception centres in El Hierro are overwhelmed.',
      choices: [
        { label: 'Distribute minors among all regions', desc: 'Humanitarian burden-sharing; right-wing regions object.', cost: 1.2, fx: 'immigrants 0.1, patriots -0.15, tension 0.01', turns: 6 },
        { label: 'Push for EU returns deal', desc: 'Tighter patrols with Mauritania and Senegal.', fx: 'immigrants -0.15, patriots 0.1, liberty -0.02, immigration -0.03', turns: 6 },
      ] },
    { id: 'recordTourism', title: 'Record tourist season', local: 'Récord de turistas',
      chance: (st) => (st.quarter === 3 ? 0.25 * st.sims.tourism : 0),
      text: 'A new record of foreign visitors. Hotels are full; residents complain about crowds.',
      fx: 'growth 0.02, tourismWorkers 0.1, tenants -0.05', turns: 3 },
    { id: 'tractors', title: 'Tractor protests', local: 'Tractoradas',
      chance: (st) => (st.groupHappy.farmers < 0.35 ? 0.18 : 0.02),
      text: 'Farmers block motorways and the centre of Madrid with tractors, protesting EU rules, low prices and drought.',
      choices: [
        { label: 'Concede: cut red tape, emergency aid', desc: '€1.5bn package and relaxed environmental rules.', cost: 1.5, fx: 'farmers 0.2, environmentalists -0.1', turns: 6 },
        { label: 'Hold firm', desc: 'Promise dialogue but no new money.', fx: 'farmers -0.12, everyone -0.015, environmentalists 0.05', turns: 4 },
      ] },
    { id: 'blackout', title: 'Nationwide blackout', local: 'Gran apagón',
      chance: (st) => (0.01 + Math.max(0, st.sims.renewables - 0.6) * 0.1 + Math.max(0, st.pol('nuclearPhaseout') - 0.6) * 0.03) * (1.3 - st.pol('greenHydrogen')),
      why: (st) => [st.sims.renewables > 0.62 && 'A grid dominated by solar and wind has little inertia', st.pol('greenHydrogen') < 0.3 && 'Little investment in storage', st.pol('nuclearPhaseout') > 0.7 && 'Nuclear plants are closing fast'],
      text: 'The entire Iberian peninsula loses power for 12 hours. Trains stop, phones die, people queue for radios. What went wrong?',
      choices: [
        { label: 'Keep nuclear plants open longer', desc: 'Delay the nuclear phase-out to add grid inertia.', policy: ['nuclearPhaseout', -0.25], fx: 'environmentalists -0.12, investment 0.02', turns: 6 },
        { label: 'Invest €4bn in grid storage', desc: 'Batteries, pumped hydro and interconnectors.', cost: 4, fx: 'renewables 0.02, energy -0.02, environmentalists 0.05', turns: 8 },
      ] },
    { id: 'referendum', title: 'Unilateral referendum announced', local: 'Referéndum unilateral',
      chance: (st) => (st.sims.tension > 0.62 ? 0.12 : 0) + (st.pol('recentralisation') > 0.3 ? 0.05 : 0),
      why: (st) => [st.sims.tension > 0.62 && 'Territorial tension is very high', st.pol('recentralisation') > 0.3 && 'Central oversight is provoking Catalan institutions'],
      text: 'The Catalan government announces an independence referendum without Madrid\'s consent.',
      choices: [
        { label: 'Apply Article 155', desc: 'Take control of the Generalitat and stop the vote.', policy: ['recentralisation', 0.5], fx: 'patriots 0.25, catalanNat -0.35, tension 0.08, liberty -0.05', turns: 8 },
        { label: 'Offer a negotiated deal', desc: 'Promise a new autonomy statute in exchange for calling it off.', policy: ['dialogue', 0.2], fx: 'catalanNat 0.2, patriots -0.25, tension -0.08', turns: 8 },
      ] },
    { id: 'euFunds', title: 'EU recovery funds tranche', local: 'Fondos Next Generation',
      chance: (st) => (st.year >= 2021 && st.year <= 2029 ? 0.12 : 0),
      text: 'Brussels releases another tranche of NextGenerationEU funds.',
      fx: 'growth 0.02, investment 0.03', turns: 4, revenue: 10 },
    { id: 'royalScandal', title: 'Royal family scandal', local: 'Escándalo en la Casa Real',
      chance: () => 0.012,
      text: 'Reports of undeclared offshore accounts linked to a member of the royal family.',
      fx: 'patriots -0.06, secular 0.04, catalanNat 0.03, everyone -0.02', turns: 4 },
    { id: 'housingProtest', title: 'Mass housing protests', local: 'Manifestaciones por la vivienda',
      chance: (st) => (st.situations.housingCrisis ? 0.12 : 0) + (st.situations.housingCrisis && st.pol('publicHousing') < 0.3 ? 0.06 : 0),
      why: (st) => [st.situations.housingCrisis && 'The housing emergency', st.pol('publicHousing') < 0.3 && 'Almost no public housing being built'],
      text: '"Se vende, se alquila, se especula": hundreds of thousands march in Madrid, Barcelona and Málaga demanding affordable rents.',
      fx: 'tenants -0.1, youth -0.08', turns: 3, capital: -3 },
    { id: 'football', title: 'Spain wins the tournament!', local: '¡Campeones!',
      chance: (st) => (st.quarter === 3 && st.year % 2 === 0 ? 0.25 : 0),
      text: 'La Selección lifts the trophy. Celebrations from Cádiz to Girona.',
      fx: 'everyone 0.06, patriots 0.06', turns: 3 },
    { id: 'oilShock', title: 'Global oil price shock', local: 'Crisis del petróleo',
      chance: () => 0.025,
      text: 'Conflict in the Middle East sends oil and gas prices soaring.',
      fx: 'energy 0.12, inflation 0.05, growth -0.03', turns: 6 },
    { id: 'ecbHike', title: 'ECB raises interest rates', local: 'El BCE sube tipos',
      chance: (st) => (st.sims.inflation > 0.4 ? 0.12 : 0.02),
      text: 'Frankfurt tightens policy to fight euro-area inflation. Variable mortgages jump.',
      fx: 'growth -0.03, inflation -0.03, riskPremium 0.03, everyone -0.03', turns: 6 },
    { id: 'whiteTide', title: 'Doctors\' and teachers\' strike', local: 'Marea blanca y verde',
      chance: (st) => (st.groupHappy.publicSector < 0.4 ? 0.15 : 0.01) + (st.pol('healthcare') < 0.45 ? 0.06 : 0) + (st.pol('education') < 0.4 ? 0.05 : 0),
      why: (st) => [st.groupHappy.publicSector < 0.4 && 'Civil servants are unhappy', st.pol('healthcare') < 0.45 && 'Healthcare is underfunded', st.pol('education') < 0.4 && 'Schools are underfunded'],
      text: 'Doctors and teachers walk out over pay and workload. Waiting lists grow.',
      fx: 'health -0.03, education -0.01, publicSector -0.05', turns: 3, capital: -3 },
    { id: 'techHub', title: 'Tech giant opens European hub', local: 'Una tecnológica elige España',
      chance: (st) => st.sims.productivity * 0.06,
      text: 'A major tech company picks Spain for its new European headquarters and data centre.',
      fx: 'investment 0.05, growth 0.01, youth 0.04', turns: 6 },
    { id: 'bailout', title: 'Markets shut Spain out', local: 'El rescate',
      chance: (st) => (st.situations.debtCrisis ? 0.35 : 0),
      text: 'Bond auctions are failing. The Eurogroup offers a rescue loan with strict conditions attached: pension cuts, a smaller state and higher VAT.',
      choices: [
        { label: 'Accept the EU rescue', desc: 'Cut pensions and the civil service, raise VAT. Markets calm down; voters do not.', policies: [['pensions', -0.2], ['civilService', -0.15], ['vat', 0.15]], fx: 'riskPremium -0.25, everyone -0.08, patriots -0.08, pensioners -0.1', turns: 8, capital: -10 },
        { label: 'Refuse and go it alone', desc: 'Defend sovereignty and hope the storm passes.', fx: 'riskPremium 0.12, growth -0.06, investment -0.12, patriots 0.06', turns: 8 },
      ] },
    { id: 'pensionReform', title: 'Brussels demands pension reform', local: 'Bruselas pide reformar las pensiones',
      chance: (st) => (st.sims.deficitRatio > 0.32 ? 0.08 : 0),
      text: 'The European Commission ties future funds to making the pension system sustainable.',
      choices: [
        { label: 'Raise the retirement age', desc: 'Push the pension age up by about a year.', policy: ['retirementAge', 0.15], fx: 'riskPremium -0.04', turns: 6 },
        { label: 'Refuse: pensions are sacred', desc: 'Defend pensioners and pick a fight with Brussels.', fx: 'pensioners 0.08, riskPremium 0.05, investment -0.03', turns: 8 },
      ] },
    { id: 'ceutaJump', title: 'Mass border jump at Ceuta', local: 'Salto a la valla de Ceuta',
      chance: (st) => (st.pol('borderControl') < 0.4 ? 0.12 : 0.01) * (0.5 + st.sims.migrationPressure),
      why: (st) => [st.pol('borderControl') < 0.4 && 'Your border control budget is low', st.sims.migrationPressure > 0.58 && 'High migration pressure'],
      text: 'Thousands of people swim around the breakwater and climb the fence into Ceuta in a single night. Morocco is accused of looking the other way.',
      choices: [
        { label: 'Reinforce the border and expel', desc: 'Send the army, return adults to Morocco quickly.', cost: 0.6, fx: 'patriots 0.12, immigrants -0.12, liberty -0.04', turns: 6 },
        { label: 'Humanitarian reception', desc: 'Process asylum claims and protect minors.', cost: 0.4, fx: 'patriots -0.15, immigrants 0.08, immigration 0.02', turns: 6 },
      ] },
    { id: 'narco', title: 'Drug gangs take on the Guardia Civil', local: 'Narcolanchas en el Estrecho',
      chance: (st) => Math.max(0, 0.55 - st.pol('police')) * 0.25 + (st.sims.crime > 0.45 ? 0.05 : 0),
      why: (st) => [st.pol('police') < 0.45 && 'Police and Guardia Civil are understaffed', st.sims.crime > 0.45 && 'Crime is high'],
      text: 'Speedboats loaded with hashish ram a Guardia Civil patrol in Barbate. Two officers die and the country is outraged.',
      choices: [
        { label: 'Special plan for the Strait', desc: 'More agents, boats and helicopters for Cádiz.', cost: 0.8, policy: ['police', 0.08], fx: 'crime -0.03, patriots 0.06', turns: 6 },
        { label: 'Blame the regional authorities', desc: 'Promise to study it.', fx: 'everyone -0.04, patriots -0.1, publicSector -0.05', turns: 6 },
      ] },
    { id: 'waterCuts', title: 'Water cuts in Barcelona and Málaga', local: 'Restricciones de agua',
      chance: (st) => (st.sims.water > 0.6 ? 0.15 : 0) * (1.3 - st.pol('waterInfra')),
      why: (st) => [st.sims.water > 0.6 && 'Reservoirs are critically low', st.pol('waterInfra') < 0.45 && 'Not enough desalination capacity'],
      text: 'Reservoirs fall below 15%. Pools are closed, gardens go dry and there is talk of shipping water in by boat.',
      choices: [
        { label: 'Emergency desalination and water ships', desc: 'Fast, expensive, and energy hungry.', cost: 1.5, policy: ['waterInfra', 0.1], fx: 'water -0.04, energy 0.01, everyone 0.02', turns: 6 },
        { label: 'Cut farm irrigation first', desc: 'Prioritise people over crops.', fx: 'farmers -0.2, rural -0.06, water -0.03', turns: 6 },
      ] },
    { id: 'erCollapse', title: 'A&E departments collapse', local: 'Colapso de las urgencias',
      chance: (st) => (st.quarter === 1 ? 0.12 : 0.03) * Math.max(0, 1.3 - 1.5 * st.pol('healthcare')) + (st.sims.health < 0.45 ? 0.05 : 0),
      why: (st) => [st.pol('healthcare') < 0.55 && 'Healthcare is underfunded', st.sims.health < 0.45 && 'Waiting lists are already long', st.quarter === 1 && 'Winter flu season'],
      text: 'Patients wait days on trolleys in hospital corridors as a flu wave hits. Doctors post photos of the chaos.',
      fx: 'pensioners -0.1, parents -0.05, publicSector -0.06, health -0.03', turns: 3, capital: -2 },
    { id: 'pensionerMarch', title: 'Pensioners march on Madrid', local: 'Marea pensionista',
      chance: (st) => (st.pol('pensions') < 0.5 ? 0.3 : 0) + (st.sims.inflation > 0.45 && st.pol('pensions') < 0.65 ? 0.1 : 0),
      why: (st) => [st.pol('pensions') < 0.5 && 'Pensions are rising less than prices', st.sims.inflation > 0.45 && 'High inflation'],
      text: 'Tens of thousands of pensioners fill the Puerta del Sol demanding that pensions keep up with prices.',
      fx: 'pensioners -0.08', turns: 3, capital: -4 },
    { id: 'capitalFlight', title: 'Fortunes flee to Portugal and Andorra', local: 'Fuga de patrimonios',
      chance: (st) => (st.pol('wealthTax') > 0.7 ? 0.15 : 0) + (st.pol('inheritanceTax') > 0.75 ? 0.08 : 0) + (st.pol('incomeTax') > 0.75 ? 0.06 : 0),
      why: (st) => [st.pol('wealthTax') > 0.7 && 'A heavy wealth tax', st.pol('inheritanceTax') > 0.75 && 'A heavy inheritance tax', st.pol('incomeTax') > 0.75 && 'Very high income tax'],
      text: 'Several billionaires and hundreds of wealthy families move their tax residence abroad. Business groups warn of an exodus.',
      fx: 'investment -0.05, wealthy -0.08, growth -0.01', turns: 6, revenue: -2 },
    { id: 'taxEvasion', title: 'Mass tax-evasion leak', local: 'Papeles filtrados',
      chance: (st) => Math.max(0, 0.55 - st.pol('taxFraud')) * 0.25,
      why: (st) => [st.pol('taxFraud') < 0.5 && 'Weak tax-fraud enforcement'],
      text: 'A leak reveals thousands of Spaniards hiding money in offshore accounts, including business leaders and footballers.',
      choices: [
        { label: 'Hire 2,000 new tax inspectors', desc: 'Go after the money.', policy: ['taxFraud', 0.15], cost: 0.3, fx: 'workers 0.06, wealthy -0.08', turns: 6 },
        { label: 'Offer a tax amnesty', desc: 'Let them bring money home with a small penalty. Quick cash, bad optics.', revenue: 3, fx: 'corruption 0.04, everyone -0.06, workers -0.08', turns: 8 },
      ] },
    { id: 'heatDeath', title: 'Summer of record heat deaths', local: 'Verano mortal',
      chance: (st) => (st.quarter === 3 ? 0.08 * (0.5 + st.sims.climate) : 0),
      text: 'Thousands of excess deaths during weeks above 40°C. Hospitals are overwhelmed.',
      fx: 'pensioners -0.1, health -0.03, environmentalists -0.05', turns: 3 },
  ];

  /* ---------------------------------------------------------------
   * PARTIES (fictional)
   *   lr/cen   : ideological position
   *   regions  : only stand in these regions (undefined = national)
   *   target   : calibration vote share at game start
   *   partner  : investiture behaviour
   * ------------------------------------------------------------- */
  S.playerDefaults = { name: 'Movimiento Progresista', short: 'MP', color: '#d7263d', lr: -0.3, cen: 0.05, target: 0.322 };

  S.parties = [
    { id: 'UC', name: 'Unión Conservadora', short: 'UC', color: '#1f5ea8', lr: 0.45, cen: 0.5, target: 0.33,
      partner: { lrW: 1, cenW: 0.4, aff: -0.1 } },
    { id: 'VP', name: 'Voz Patriótica', short: 'VP', color: '#5b9a2f', lr: 0.85, cen: 0.95, target: 0.112,
      partner: { lrW: 1, cenW: 0.6, aff: -0.5 } },
    { id: 'IP', name: 'Izquierda Plural', short: 'IP', color: '#a1307d', lr: -0.72, cen: -0.25, target: 0.123,
      partner: { lrW: 0.7, cenW: 0.2, aff: 0.25 } },
    { id: 'CC', name: 'Centro Cívico', short: 'CC', color: '#f08a24', lr: 0.12, cen: 0.55, target: 0.012,
      partner: { lrW: 0.8, cenW: 0.5, aff: -0.15 } },
    { id: 'EC', name: 'Esquerra Catalana', short: 'EC', color: '#e8b10a', lr: -0.45, cen: -0.9, regions: ['CAT'], target: 0.019,
      partner: { lrW: 0.5, cenW: 0.25, aff: 0.05, demands: [['dialogue', 0.45, 0.25], ['languages', 0.45, 0.1], ['catalanFiscal', 0.2, 0.2], ['selfDetermination', 0.2, 0.3], ['recentralisation', 0.01, -0.8]] } },
    { id: 'CL', name: 'Catalunya Lliure', short: 'CL', color: '#21b5a8', lr: 0.25, cen: -0.95, regions: ['CAT'], target: 0.016,
      partner: { lrW: 0.4, cenW: 0.25, aff: -0.15, demands: [['dialogue', 0.5, 0.25], ['catalanFiscal', 0.3, 0.3], ['selfDetermination', 0.2, 0.3], ['languages', 0.5, 0.1], ['recentralisation', 0.01, -0.8]] } },
    { id: 'PV', name: 'Partido Vasco', short: 'PV', color: '#0e6b3a', lr: 0.15, cen: -0.7, regions: ['PV', 'NAV'], target: 0.011,
      partner: { lrW: 0.5, cenW: 0.25, aff: 0.25, demands: [['languages', 0.45, 0.1], ['recentralisation', 0.01, -0.8]] } },
    { id: 'EA', name: 'Ezker Abertzalea', short: 'EA', color: '#9bc53d', lr: -0.65, cen: -0.95, regions: ['PV', 'NAV'], target: 0.014,
      partner: { lrW: 0.5, cenW: 0.25, aff: 0.15, demands: [['languages', 0.45, 0.1], ['dialogue', 0.45, 0.1], ['recentralisation', 0.01, -0.8]] } },
    { id: 'BG', name: 'Bloque Galego', short: 'BG', color: '#5cb8e0', lr: -0.55, cen: -0.75, regions: ['GAL'], target: 0.006,
      partner: { lrW: 0.5, cenW: 0.25, aff: 0.15, demands: [['languages', 0.45, 0.1], ['recentralisation', 0.01, -0.8]] } },
    { id: 'UCan', name: 'Unión Canaria', short: 'UCan', color: '#ffd21f', lr: 0.1, cen: -0.3, regions: ['CAN'], target: 0.005,
      partner: { lrW: 0.4, cenW: 0.2, aff: 0.35, demands: [['regionalFunding', 0.5, 0.1]] } },
    { id: 'EV', name: 'España Vaciada', short: 'EV', color: '#8b5a2b', lr: 0.0, cen: 0.1, provinces: ['Teruel', 'Soria', 'Zamora', 'Cuenca', 'Ávila', 'Palencia', 'Segovia', 'Huesca'], target: 0.004,
      partner: { lrW: 0.4, cenW: 0.2, aff: 0.25, demands: [['ruralPlan', 0.45, 0.2]] } },
  ];

  /* ---------------------------------------------------------------
   * REGIONS (Comunidades Autónomas) & PROVINCES (constituencies)
   *   cen    : regional baseline on centralist axis
   *   rural  : share of voters in rural areas
   *   tour   : tourism intensity multiplier
   *   seats  : Congreso seats per province (52 constituencies, 350 seats)
   *   pop    : approx. population (millions)
   * ------------------------------------------------------------- */
  S.regions = {
    AND: { name: 'Andalusia', local: 'Andalucía', cen: 0.3, lrBias: -0.03 },
    ARA: { name: 'Aragon', local: 'Aragón', cen: 0.25 },
    AST: { name: 'Asturias', local: 'Asturias', cen: 0.2, lrBias: -0.08 },
    BAL: { name: 'Balearic Islands', local: 'Illes Balears', cen: 0.05 },
    CAN: { name: 'Canary Islands', local: 'Canarias', cen: -0.05 },
    CNT: { name: 'Cantabria', local: 'Cantabria', cen: 0.3, lrBias: 0.05 },
    CLM: { name: 'Castilla–La Mancha', local: 'Castilla-La Mancha', cen: 0.45, lrBias: 0.05 },
    CYL: { name: 'Castilla y León', local: 'Castilla y León', cen: 0.45, lrBias: 0.1 },
    CAT: { name: 'Catalonia', local: 'Catalunya', cen: -0.45, lrBias: -0.1 },
    VAL: { name: 'Valencian Community', local: 'Comunitat Valenciana', cen: 0.15, lrBias: 0.04 },
    EXT: { name: 'Extremadura', local: 'Extremadura', cen: 0.4 },
    GAL: { name: 'Galicia', local: 'Galicia', cen: -0.05, lrBias: 0.05 },
    MAD: { name: 'Madrid', local: 'Comunidad de Madrid', cen: 0.5, lrBias: 0.1 },
    MUR: { name: 'Murcia', local: 'Región de Murcia', cen: 0.45, lrBias: 0.15 },
    NAV: { name: 'Navarre', local: 'Navarra', cen: -0.2 },
    PV: { name: 'Basque Country', local: 'Euskadi', cen: -0.45, lrBias: -0.08 },
    RIO: { name: 'La Rioja', local: 'La Rioja', cen: 0.35, lrBias: 0.08 },
    CEU: { name: 'Ceuta', local: 'Ceuta', cen: 0.6, lrBias: 0.15 },
    MEL: { name: 'Melilla', local: 'Melilla', cen: 0.6, lrBias: 0.15 },
  };

  // [name, region, seats, population (M), rural share, tourism intensity]
  S.provinces = [
    ['Madrid', 'MAD', 37, 6.9, 0.05, 0.8], ['Barcelona', 'CAT', 32, 5.8, 0.08, 1.2], ['Valencia', 'VAL', 16, 2.6, 0.12, 1.0],
    ['Alicante', 'VAL', 12, 1.9, 0.1, 1.8], ['Sevilla', 'AND', 12, 1.95, 0.15, 1.0], ['Málaga', 'AND', 11, 1.7, 0.1, 1.9],
    ['Murcia', 'MUR', 10, 1.55, 0.15, 0.8], ['Cádiz', 'AND', 9, 1.25, 0.12, 1.2], ['Baleares', 'BAL', 8, 1.2, 0.1, 3.0],
    ['Las Palmas', 'CAN', 8, 1.13, 0.08, 2.6], ['Bizkaia', 'PV', 8, 1.15, 0.06, 0.6], ['A Coruña', 'GAL', 8, 1.12, 0.25, 0.6],
    ['Asturias', 'AST', 7, 1.0, 0.25, 0.7], ['Santa Cruz de Tenerife', 'CAN', 7, 1.05, 0.12, 2.6], ['Zaragoza', 'ARA', 7, 0.97, 0.15, 0.5],
    ['Pontevedra', 'GAL', 7, 0.94, 0.25, 0.7], ['Granada', 'AND', 7, 0.92, 0.3, 1.1], ['Tarragona', 'CAT', 6, 0.83, 0.2, 1.5],
    ['Córdoba', 'AND', 6, 0.78, 0.3, 0.7], ['Gipuzkoa', 'PV', 6, 0.72, 0.15, 0.8], ['Toledo', 'CLM', 6, 0.71, 0.4, 0.4],
    ['Almería', 'AND', 6, 0.73, 0.35, 0.9], ['Girona', 'CAT', 6, 0.79, 0.25, 2.0], ['Badajoz', 'EXT', 5, 0.67, 0.45, 0.3],
    ['Navarra', 'NAV', 5, 0.66, 0.3, 0.5], ['Castellón', 'VAL', 5, 0.59, 0.25, 1.1], ['Cantabria', 'CNT', 5, 0.59, 0.3, 0.8],
    ['Valladolid', 'CYL', 5, 0.52, 0.25, 0.4], ['Ciudad Real', 'CLM', 5, 0.49, 0.45, 0.3], ['Huelva', 'AND', 5, 0.52, 0.35, 0.8],
    ['Jaén', 'AND', 5, 0.62, 0.5, 0.3], ['León', 'CYL', 4, 0.45, 0.45, 0.4], ['Lleida', 'CAT', 4, 0.44, 0.45, 0.5],
    ['Cáceres', 'EXT', 4, 0.39, 0.55, 0.4], ['Albacete', 'CLM', 4, 0.39, 0.4, 0.2], ['Burgos', 'CYL', 4, 0.36, 0.45, 0.3],
    ['Salamanca', 'CYL', 4, 0.33, 0.45, 0.5], ['Lugo', 'GAL', 4, 0.33, 0.6, 0.3], ['Ourense', 'GAL', 4, 0.30, 0.6, 0.3],
    ['La Rioja', 'RIO', 4, 0.32, 0.35, 0.5], ['Araba/Álava', 'PV', 4, 0.33, 0.25, 0.3], ['Guadalajara', 'CLM', 3, 0.27, 0.45, 0.2],
    ['Huesca', 'ARA', 3, 0.22, 0.6, 0.6], ['Cuenca', 'CLM', 3, 0.2, 0.7, 0.3], ['Zamora', 'CYL', 3, 0.17, 0.7, 0.2],
    ['Ávila', 'CYL', 3, 0.16, 0.65, 0.3], ['Palencia', 'CYL', 3, 0.16, 0.6, 0.2], ['Segovia', 'CYL', 3, 0.155, 0.6, 0.5],
    ['Teruel', 'ARA', 3, 0.135, 0.75, 0.3], ['Soria', 'CYL', 2, 0.09, 0.75, 0.2], ['Ceuta', 'CEU', 1, 0.083, 0, 0.3],
    ['Melilla', 'MEL', 1, 0.085, 0, 0.3],
  ].map(([name, region, seats, pop, rural, tour]) => ({ name, region, seats, pop, rural, tour }));

  /* ---------------------------------------------------------------
   * MACRO-ECONOMY: tax bases
   *   labourForce : million people working or looking for work
   *   labourShare : wages as a share of GDP (moves with these drivers)
   *   consumptionShare / profitShare : bases for VAT and corporate tax
   * ------------------------------------------------------------- */
  S.macro = {
    labourForce: 24.6,
    labourShare: 0.47,
    labourShareFx: 'minWage 0.06, labourProtection 0.03, automation -0.06, unemployment -0.05',
    consumptionShare: 0.57,
    profitShare: 0.42,
    incomeTaxProgressivity: 0.5, // IRPF grows faster than wages as people move into higher brackets
  };

  /* ---------------------------------------------------------------
   * STARTING SCENARIOS
   *   apply(S, rand) edits a copy of this scenario before the game starts.
   * ------------------------------------------------------------- */
  const setSims = (X, o) => Object.entries(o).forEach(([k, v]) => (X.sims[k].init = v));
  const setPols = (X, o) => Object.entries(o).forEach(([k, v]) => { const p = X.policies.find((q) => q.id === k); p.init = v; });
  const setTargets = (X, o) => Object.entries(o).forEach(([k, v]) => { if (k === 'player') X.playerDefaults.target = v; else X.parties.find((p) => p.id === k).target = v; });
  const shiftMood = (X, d, only) => Object.keys(X.groups).forEach((g) => { if (!only || only.includes(g)) X.groups[g].start = Math.max(0.15, Math.min(0.85, X.groups[g].start + d)); });
  // Player governs from the centre-right: the main rival becomes a centre-left party
  function rightWingGovernment(X) {
    Object.assign(X.playerDefaults, { name: 'Alianza Liberal', short: 'AL', color: '#1f5ea8', lr: 0.4, cen: 0.45, side: 'right' });
    const i = X.parties.findIndex((p) => p.id === 'UC');
    X.parties[i] = { id: 'PSD', name: 'Partido Socialdemócrata', short: 'PSD', color: '#e4572e', lr: -0.3, cen: 0.05, target: X.parties[i].target, partner: { lrW: 1, cenW: 0.4, aff: -0.1 } };
    X.parties.find((p) => p.id === 'VP').partner.aff = 0.15;
    X.parties.find((p) => p.id === 'IP').partner.aff = -0.4;
    X.parties.find((p) => p.id === 'CC').partner.aff = 0.15;
    setPols(X, { incomeTax: 0.42, wealthTax: 0.2, inheritanceTax: 0.12, corpTax: 0.42, windfallTax: null, minWage: 0.4, labourProtection: 0.4,
      rentControl: null, touristFlats: 0.2, dialogue: 0.1, securityLaw: 0.6, memoryLaw: 0.25, churchFunding: 0.6, charterSchools: 0.6,
      healthOutsourcing: 0.45, bullfighting: 0.6, minimumIncome: 0.3, borderControl: 0.6, defence: 0.5, genderEquality: 0.45, languages: 0.35 });
  }

  S.presets = [
    { id: 'reality', name: 'Spain today', local: 'La realidad', year: 2027, difficulty: 'Normal',
      desc: 'Start from Spain as it is: a centre-left minority government, a housing emergency, record tourism, debt above 100% and a fragmented Congress.',
      apply() {} },
    { id: 'majority', name: 'Absolute majority', local: 'Mayoría absoluta', year: 2027, difficulty: 'Easy',
      desc: 'The same Spain, but voters have handed you 180+ seats. No partners to please, and no one else to blame.',
      apply(X) { setTargets(X, { player: 0.44, UC: 0.26, VP: 0.1, IP: 0.09, CC: 0.01 }); shiftMood(X, 0.03); } },
    { id: 'boom2006', name: 'The housing bubble', local: 'La burbuja (2006)', year: 2006, difficulty: 'Deceptively easy',
      desc: 'Cranes everywhere, 4% growth, a budget surplus and 900,000 immigrants a year. House prices are insane and the global financial crisis is coming. Can you land the plane?',
      apply(X) {
        X.startYear = 2006; X.gdp0 = 985; X.debt0 = 385; X.targetDeficit0 = -0.02; X.revenueShare0 = 0.4; X.effRate0 = 0.04;
        setSims(X, { growth: 0.72, unemployment: 0.28, inflation: 0.4, investment: 0.7, productivity: 0.32, precarity: 0.85, tourism: 0.45, energy: 0.3,
          riskPremium: 0.01, housing: 0.82, poverty: 0.46, inequality: 0.5, crime: 0.32, corruption: 0.6, immigration: 0.9, renewables: 0.25,
          emissions: 0.85, water: 0.55, depopulation: 0.5, birthrate: 0.25, gender: 0.5, tension: 0.35, infrastructure: 0.5,
          world: 0.56, climate: 0.43, ageing: 0.38, ecbRates: 0.55, oilPrice: 0.45, geopolitics: 0.45, migrationPressure: 0.55, automation: 0.05, euFunds: 0.3 });
        X.sims.euFunds.drive = { mean: 0.3, rev: 1 };
        X.sims.world.drive = Object.assign({}, X.sims.world.drive, { amp: 0.12, phase: 20 }); // the 2008 crash is on its way
        setPols(X, { landReform: 0.85, minimumIncome: null, dialogue: 0.2, euthanasia: null, memoryLaw: 0.2, touristTax: null, windfallTax: null,
          touristFlats: null, rentControl: null, minWage: 0.05, wealthTax: 0.5, retirementAge: 0.33, renewableSubsidy: 0.7, nuclearPhaseout: 0.4,
          childcare: 0.1, aiStrategy: null, greenHydrogen: null, energyBonus: null, publicHousing: 0.35, lowEmissionZones: null, evSubsidy: null });
        setTargets(X, { player: 0.43, UC: 0.38, VP: 0.003, IP: 0.05, CC: 0.002, EC: 0.025, CL: 0.032, PV: 0.016, EA: 0.003, BG: 0.008, UCan: 0.009, EV: 0.001 });
        shiftMood(X, 0.05);
      } },
    { id: 'crisis2012', name: 'The Great Recession', local: 'La crisis (2012)', year: 2012, difficulty: 'Very hard',
      desc: 'A centre-right government with an absolute majority inherits 24% unemployment, a 7% deficit, a banking crisis and a risk premium of 450 points. Brussels is watching.',
      apply(X) {
        rightWingGovernment(X);
        X.startYear = 2012; X.gdp0 = 1040; X.debt0 = 890; X.targetDeficit0 = 0.07; X.revenueShare0 = 0.37; X.effRate0 = 0.036;
        setSims(X, { growth: 0.2, unemployment: 0.8, inflation: 0.3, investment: 0.25, productivity: 0.36, precarity: 0.6, tourism: 0.45, energy: 0.35,
          riskPremium: 0.75, housing: 0.5, poverty: 0.6, inequality: 0.68, crime: 0.33, corruption: 0.65, immigration: 0.15, renewables: 0.32,
          emissions: 0.65, water: 0.5, depopulation: 0.55, birthrate: 0.33, gender: 0.55, tension: 0.6, infrastructure: 0.6,
          world: 0.42, climate: 0.45, ageing: 0.4, ecbRates: 0.15, oilPrice: 0.75, geopolitics: 0.45, migrationPressure: 0.45, automation: 0.1, euFunds: 0.3 });
        X.sims.euFunds.drive = { mean: 0.3, rev: 1 };
        setPols(X, { minimumIncome: null, dialogue: null, euthanasia: null, touristTax: null, rentControl: null, touristFlats: null, minWage: 0,
          retirementAge: 0.38, aiStrategy: null, greenHydrogen: null, energyBonus: 0.2, lowEmissionZones: null, evSubsidy: 0.1, memoryLaw: 0.2, childcare: 0.1 });
        setTargets(X, { player: 0.446, PSD: 0.29, VP: 0.003, IP: 0.07, CC: 0.047, EC: 0.011, CL: 0.042, PV: 0.013, EA: 0.014, BG: 0.008, UCan: 0.006, EV: 0.001 });
        shiftMood(X, -0.03);
        shiftMood(X, -0.05, ['youth', 'unemployed', 'workers', 'tenants']);
      } },
    { id: 'proces2017', name: 'The Catalan crisis', local: 'El procés (2017)', year: 2017, difficulty: 'Hard',
      desc: 'A centre-right minority government with 137 seats. The Generalitat is heading for an illegal referendum, unemployment is 17% and four parties split the vote.',
      apply(X) {
        rightWingGovernment(X);
        X.startYear = 2017; X.gdp0 = 1160; X.debt0 = 1145; X.targetDeficit0 = 0.03; X.revenueShare0 = 0.38; X.effRate0 = 0.027;
        setSims(X, { growth: 0.6, unemployment: 0.57, inflation: 0.25, investment: 0.55, productivity: 0.37, precarity: 0.65, tourism: 0.63,
          riskPremium: 0.2, housing: 0.58, poverty: 0.54, inequality: 0.62, corruption: 0.62, immigration: 0.4, renewables: 0.38,
          tension: 0.85, water: 0.55, birthrate: 0.25, world: 0.53, climate: 0.47, ageing: 0.45, ecbRates: 0.1, oilPrice: 0.3, automation: 0.15, euFunds: 0.3 });
        X.sims.euFunds.drive = { mean: 0.3, rev: 1 };
        setPols(X, { minimumIncome: null, dialogue: 0.05, euthanasia: null, rentControl: null, minWage: 0.1, aiStrategy: null, greenHydrogen: null, lowEmissionZones: 0.15, childcare: 0.15 });
        setTargets(X, { player: 0.33, PSD: 0.226, IP: 0.21, CC: 0.13, VP: 0.002, EC: 0.026, CL: 0.02, PV: 0.012, EA: 0.008, BG: 0.003, UCan: 0.003, EV: 0.001 });
        shiftMood(X, -0.04, ['catalanNat', 'patriots']);
      } },
    { id: 'random', name: 'Random Spain', local: 'Aleatorio', year: 2027, difficulty: 'Unknown',
      desc: 'A randomly generated country: the economy, the budget, the mood of voters, the parliament and even which side you govern from are all rolled at random.',
      apply(X, rnd) {
        const j = (base, spread, lo = 0.05, hi = 0.95) => Math.max(lo, Math.min(hi, base + (rnd() - 0.5) * 2 * spread));
        if (rnd() < 0.5) rightWingGovernment(X);
        ['growth', 'unemployment', 'inflation', 'housing', 'poverty', 'inequality', 'crime', 'health', 'education', 'corruption', 'tension',
          'water', 'depopulation', 'tourism', 'immigration', 'precarity', 'energy', 'productivity', 'investment', 'birthrate'].forEach((k) => (X.sims[k].init = j(X.sims[k].init, 0.15)));
        ['world', 'ecbRates', 'oilPrice', 'geopolitics', 'migrationPressure'].forEach((k) => (X.sims[k].init = j(X.sims[k].init, 0.15, 0.15, 0.85)));
        X.debt0 = X.gdp0 * j(1.0, 0.35, 0.5, 1.4);
        X.targetDeficit0 = j(0.025, 0.035, -0.015, 0.07);
        X.sims.riskPremium.init = Math.max(0.02, Math.min(0.6, 0.11 + (X.debt0 / X.gdp0 - 1.02) * 0.5 + (X.targetDeficit0 - 0.028) * 3 + (rnd() - 0.5) * 0.06));
        X.policies.forEach((p) => { if (p.init != null && !p.fmtLevel) p.init = j(p.init, 0.15, 0.02, 0.98); });
        const rival = X.parties.find((p) => p.id === 'UC' || p.id === 'PSD');
        X.playerDefaults.target = j(0.33, 0.07, 0.25, 0.42);
        rival.target = j(0.29, 0.07, 0.18, 0.38);
        X.parties.find((p) => p.id === 'VP').target = j(0.11, 0.07, 0.02, 0.2);
        X.parties.find((p) => p.id === 'IP').target = j(0.11, 0.06, 0.03, 0.2);
        X.parties.find((p) => p.id === 'CC').target = j(0.03, 0.03, 0.002, 0.08);
        Object.keys(X.groups).forEach((g) => (X.groups[g].start = j(X.groups[g].start, 0.06, 0.2, 0.8)));
      } },
  ];


  /* ---------------------------------------------------------------
   * PARTY POSITIONING (chosen on the start screen)
   *   Moving your party re-tunes your starting policies, and the main rival
   *   becomes whichever big party sits on the other side of you.
   * ------------------------------------------------------------- */
  S.positions = {
    lr: [
      { id: 'left', name: 'Left', lr: -0.65, party: { name: 'Alternativa Social', short: 'AS', color: '#b0233a' }, desc: 'Radical economic change: wealth taxes, public ownership, strong unions.' },
      { id: 'centreLeft', name: 'Centre-left', lr: -0.3, party: { name: 'Movimiento Progresista', short: 'MP', color: '#d7263d' }, desc: 'Social democracy: welfare state, labour rights, gradual reform.' },
      { id: 'centre', name: 'Centre', lr: 0, party: { name: 'Partido del Centro', short: 'PDC', color: '#e89f00' }, desc: 'Pragmatic and liberal: fiscal prudence with a social conscience.' },
      { id: 'centreRight', name: 'Centre-right', lr: 0.4, party: { name: 'Alianza Liberal', short: 'AL', color: '#1f5ea8' }, desc: 'Conservative-liberal: lower taxes, business-friendly, traditional values.' },
      { id: 'right', name: 'Right', lr: 0.72, party: { name: 'Nación y Libertad', short: 'NyL', color: '#2a4d8f' }, desc: 'National conservatism: tough on crime and immigration, low taxes.' },
    ],
    cen: [
      { id: 'devolution', name: 'Pro-devolution', cen: -0.45, desc: 'More power and money for the regions; dialogue with Catalonia.' },
      { id: 'balanced', name: 'Balanced', cen: null, desc: 'Defend the current system of autonomous communities.' },
      { id: 'centralist', name: 'Centralist', cen: 0.75, desc: 'One nation: strengthen Madrid\'s hand over the regions.' },
    ],
  };

  const CONSERVATIVE_RIVAL = { id: 'UC', name: 'Unión Conservadora', short: 'UC', color: '#1f5ea8', lr: 0.45, cen: 0.5, partner: { lrW: 1, cenW: 0.4, aff: -0.1 } };
  const SOCIAL_DEMOCRAT_RIVAL = { id: 'PSD', name: 'Partido Socialdemócrata', short: 'PSD', color: '#e4572e', lr: -0.3, cen: 0.05, partner: { lrW: 1, cenW: 0.4, aff: -0.1 } };
  function swapRival(X, from, to) {
    const i = X.parties.findIndex((p) => p.id === from.id);
    if (i < 0) return;
    X.parties[i] = Object.assign({}, to, { target: X.parties[i].target, partner: Object.assign({}, to.partner) });
  }

  // pos = { lr: positionId | null, cen: positionId | null }; null keeps the scenario's default
  S.applyPosition = function (X, pos) {
    if (!pos || (!pos.lr && !pos.cen)) return;
    const L = S.positions.lr.find((o) => o.id === pos.lr);
    const Cn = S.positions.cen.find((o) => o.id === pos.cen);
    const oldLr = X.playerDefaults.lr, oldCen = X.playerDefaults.cen;
    const lr = L ? L.lr : oldLr;
    let cen = oldCen;
    if (Cn) cen = Cn.cen != null ? Cn.cen : lr >= 0.15 ? 0.45 : 0.05;
    else if (L && (lr >= 0.15) !== (oldLr >= 0.15)) cen = lr >= 0.15 ? 0.45 : 0.05; // switching sides: adopt that side's usual stance
    // Starting policies follow your ideology
    X.policies.forEach((p) => {
      if (p.init == null || p.fmtLevel && !p.lr && !p.cen) return;
      const d = (lr - oldLr) * (p.lr || 0) + (cen - oldCen) * (p.cen || 0);
      if (d) p.init = Math.max(0.02, Math.min(0.98, p.init + d * 0.8));
    });
    // The main rival is the big party on the other side of you
    if (lr >= 0.15) swapRival(X, CONSERVATIVE_RIVAL, SOCIAL_DEMOCRAT_RIVAL);
    else if (lr <= -0.15) swapRival(X, SOCIAL_DEMOCRAT_RIVAL, CONSERVATIVE_RIVAL);
    // Who could back you in parliament
    const aff = (id, v) => { const p = X.parties.find((q) => q.id === id); if (p) p.partner.aff = v; };
    if (lr >= 0.15) { aff('VP', lr > 0.6 ? 0.4 : 0.35); aff('IP', -0.4); aff('CC', 0.15); }
    else if (lr <= -0.15) { aff('VP', -0.5); aff('IP', lr < -0.5 ? 0.35 : 0.25); aff('CC', -0.15); }
    else { aff('VP', -0.3); aff('IP', 0); aff('CC', 0.25); }
    const party = (L || S.positions.lr.reduce((a, b) => (Math.abs(b.lr - lr) < Math.abs(a.lr - lr) ? b : a))).party;
    Object.assign(X.playerDefaults, party, { lr, cen, side: lr >= 0.15 ? 'right' : lr <= -0.15 ? 'left' : 'centre' });
  };

  // Province map (IGN boundaries via es-atlas). Keys: INE province codes.
  S.map = {
    url: 'https://cdn.jsdelivr.net/npm/es-atlas@0.6.0/es/provinces.json',
    object: 'provinces', regionsObject: 'autonomous_regions', projection: 'geoConicConformalSpain',
    codes: { '01': 'Araba/Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona',
      '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona',
      '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa', '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida', '26': 'La Rioja',
      '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
      '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
      '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla' },
  };

  S.adaptToEra = function (X) {
    if (X.startYear < 2023) {
      Object.assign(X.sims.automation, { name: 'Automation', local: 'Automatización', unit: 'robots and software in the economy',
        desc: 'Robots and software spread through factories and offices: productivity rises, but some jobs disappear. Generative AI arrives in the early 2020s.' });
    }
  };

  /* ---------------------------------------------------------------
   * GOALS (per scenario) & MILESTONES
   *   goal: { title, sim, below|above } | { deficitBelow } | { debtBelow } | { approvalAbove } | { win: true }
   * ------------------------------------------------------------- */
  S.defaultGoals = [
    { id: 'rent', title: 'Bring rents below 35% of income', sim: 'housing', below: 35 / 55 },
    { id: 'jobs', title: 'Cut unemployment below 8%', sim: 'unemployment', below: 8 / 30 },
    { id: 'deficit', title: 'Cut the deficit below 2%', deficitBelow: 0.02 },
    { id: 'win', title: 'Win the next general election', win: true },
  ];
  const goalsFor = {
    majority: [
      { id: 'rent', title: 'Bring rents below 33% of income', sim: 'housing', below: 33 / 55 },
      { id: 'jobs', title: 'Cut unemployment below 7.5%', sim: 'unemployment', below: 7.5 / 30 },
      { id: 'debt', title: 'Bring debt below 95% of GDP', debtBelow: 0.95 },
      { id: 'win', title: 'Win the next general election', win: true },
    ],
    boom2006: [
      { id: 'rent', title: 'Cool the housing market: rents below 40% of income', sim: 'housing', below: 40 / 55 },
      { id: 'renew', title: 'Renewables above 40% of electricity', sim: 'renewables', above: 0.4 },
      { id: 'prod', title: 'Raise the innovation index to 45', sim: 'productivity', above: 0.45 },
      { id: 'win', title: 'Win the next general election', win: true },
    ],
    crisis2012: [
      { id: 'jobs', title: 'Cut unemployment below 18%', sim: 'unemployment', below: 18 / 30 },
      { id: 'rp', title: 'Bring the risk premium below 150 points', sim: 'riskPremium', below: 150 / 600 },
      { id: 'deficit', title: 'Get the deficit under 3%', deficitBelow: 0.03 },
      { id: 'win', title: 'Win the next general election', win: true },
    ],
    proces2017: [
      { id: 'tension', title: 'Bring support for independence below 40%', sim: 'tension', below: 0.5 },
      { id: 'jobs', title: 'Cut unemployment below 13%', sim: 'unemployment', below: 13 / 30 },
      { id: 'win', title: 'Win the next general election', win: true },
    ],
    random: [
      { id: 'approval', title: 'Raise approval above 50%', approvalAbove: 0.5 },
      { id: 'deficit', title: 'Get the deficit under 3%', deficitBelow: 0.03 },
      { id: 'win', title: 'Win the next general election', win: true },
    ],
  };
  S.goalsForPreset = (id) => goalsFor[id] || S.defaultGoals;

  // One-off milestones, celebrated the first time they happen
  S.milestones = [
    { id: 'u10', title: 'Unemployment falls below 10%', test: (c) => c.sims.unemployment < 10 / 30 },
    { id: 'u8', title: 'Unemployment falls below 8%', test: (c) => c.sims.unemployment < 8 / 30 },
    { id: 'u6', title: 'Unemployment below 6%: near full employment', test: (c) => c.sims.unemployment < 6 / 30 },
    { id: 'def3', title: 'Deficit back under the EU\'s 3% limit', test: (c) => c.deficit < 0.03 },
    { id: 'surplus', title: 'A budget surplus', test: (c) => c.deficit < 0 },
    { id: 'debt100', title: 'Public debt falls below 100% of GDP', test: (c) => c.debt < 1 },
    { id: 'debt80', title: 'Public debt falls below 80% of GDP', test: (c) => c.debt < 0.8 },
    { id: 'rent35', title: 'Rents fall below 35% of income', test: (c) => c.sims.housing < 35 / 55 },
    { id: 'growth3', title: 'The economy grows above 3%', test: (c) => c.sims.growth > 0.6 },
    { id: 'rp50', title: 'Risk premium below 50 points', test: (c) => c.sims.riskPremium < 50 / 600 },
    { id: 'renew70', title: 'Renewables pass 70% of electricity', test: (c) => c.sims.renewables > 0.7 },
    { id: 'births', title: 'Birth rate back above 1.3 children', test: (c) => c.sims.birthrate > 0.36 },
    { id: 'clean', title: 'Spain\'s clean-government score passes 70', test: (c) => c.sims.corruption < 0.3 },
    { id: 'approval50', title: 'Approval passes 50%', test: (c) => c.approval > 0.5 },
  ];

  /* ---------------------------------------------------------------
   * CAMPAIGN PROMISES
   *   Each builder looks at the current state and returns a promise, or null.
   *   keep: true  = a pledge you must not break during the term
   *   keep: false = a target you must reach before the next election
   *   groups: who it appeals to (and who it annoys)
   * ------------------------------------------------------------- */
  const pv = (st, id) => (st.policies[id].active ? st.policies[id].v : 0);
  const simTarget = (id, sim, delta, title, groups, minNow) => (st, S) => {
    const cur = st.sims[sim];
    if (minNow != null && (delta < 0 ? cur < minNow : cur > minNow)) return null;
    const t = Math.max(0.02, Math.min(0.98, cur + delta));
    const p = { id, type: 'sim', sim, keep: false, groups };
    if (delta < 0) p.below = t; else p.above = t;
    p.title = title(S.sims[sim].fmt(t));
    return p;
  };
  const polTarget = (id, pol, target, title, groups) => (st) => {
    const t = typeof target === 'function' ? target(pv(st, pol)) : target;
    if (t == null || pv(st, pol) >= t) return null;
    return { id, type: 'policies', demands: [[pol, Math.min(1, t), 'min']], keep: false, title: typeof title === 'function' ? title(t) : title, groups };
  };
  S.promiseCatalog = [
    simTarget('jobs', 'unemployment', -2.5 / 30, (t) => `Cut unemployment to ${t}`, 'workers 0.05, unemployed 0.12, youth 0.05', 6 / 30),
    simTarget('rents', 'housing', -4 / 55, (t) => `Bring rents down to ${t} of income`, 'tenants 0.12, youth 0.08'),
    simTarget('waits', 'health', 0.07, (t) => `Cut surgery waiting times to ${t}`, 'pensioners 0.08, everyone 0.02'),
    simTarget('green', 'renewables', 0.08, (t) => `Raise renewables to ${t} of electricity`, 'environmentalists 0.1, youth 0.03'),
    simTarget('crime', 'crime', -0.05, (t) => `Cut crime to ${t}`, 'pensioners 0.05, patriots 0.05, parents 0.03'),
    simTarget('tension', 'tension', -0.1, (t) => `Bring support for independence down to ${t}`, 'patriots 0.07, catalanNat -0.04', 0.35),
    (st) => {
      const d = st.lastBudget.deficit / st.gdp;
      if (d < 0.01) return null;
      const t = Math.max(0.005, d - 0.015);
      return { id: 'deficit', type: 'deficit', below: t, keep: false, title: `Cut the deficit to ${(t * 100).toFixed(1)}% of GDP`, groups: 'wealthy 0.05, selfEmployed 0.04, pensioners 0.02' };
    },
    polTarget('minWage', 'minWage', (v) => (v < 0.9 ? Math.min(1, v + 0.12) : null), (t) => `Raise the minimum wage to €${Math.round(800 + t * 700)}`, 'workers 0.08, lowIncome 0.08, selfEmployed -0.04'),
    polTarget('housing', 'publicHousing', (v) => Math.max(0.6, v + 0.25), 'Build public housing on a large scale', 'tenants 0.1, youth 0.06'),
    polTarget('childcare', 'childcare', 0.75, 'Free nursery places for every child', 'parents 0.1, feminists 0.04'),
    polTarget('hours', 'workWeek', 0.5, 'A 37.5-hour working week', 'workers 0.09, selfEmployed -0.05'),
    polTarget('borders', 'borderControl', (v) => Math.max(0.7, v + 0.2), 'Take back control of the borders', 'patriots 0.1, immigrants -0.06'),
    polTarget('catalonia', 'catalanFiscal', 0.3, 'A new financing deal for Catalonia', 'catalanNat 0.12, patriots -0.06'),
    (st) => (pv(st, 'pensions') >= 0.6 ? { id: 'pensions', type: 'policies', demands: [['pensions', 0.6, 'min']], keep: true, title: 'Pensions will always rise with prices', groups: 'pensioners 0.12' } : null),
    (st) => ({ id: 'noTax', type: 'policies', demands: [['incomeTax', pv(st, 'incomeTax'), 'max'], ['vat', pv(st, 'vat'), 'max']], keep: true, title: 'No rise in income tax or VAT', groups: 'selfEmployed 0.06, wealthy 0.06, everyone 0.02' }),
    (st) => (pv(st, 'incomeTax') > 0.25 ? { id: 'cutTax', type: 'policies', demands: [['incomeTax', pv(st, 'incomeTax') - 0.1, 'max']], keep: false, title: 'Cut income tax', groups: 'wealthy 0.08, selfEmployed 0.06, everyone 0.02' } : null),
    (st) => (!st.policies.selfDetermination.active ? { id: 'noReferendum', type: 'policies', demands: [['selfDetermination', 0, 'off']], keep: true, title: 'No independence referendum, ever', groups: 'patriots 0.1, catalanNat -0.05' } : null),
  ];

  // What national parties ask for in coalition talks: [policy, level, 'min' | 'max' | 'off']
  S.partyAsks = {
    IP: [['rentControl', 0.6, 'min'], ['minWage', 0.72, 'min'], ['wealthTax', 0.65, 'min'], ['publicHousing', 0.55, 'min']],
    UC: [['incomeTax', 0.42, 'max'], ['dialogue', 0.25, 'max'], ['securityLaw', 0.5, 'min']],
    PSD: [['minWage', 0.6, 'min'], ['publicHousing', 0.45, 'min'], ['healthcare', 0.65, 'min']],
    VP: [['borderControl', 0.8, 'min'], ['dialogue', 0.1, 'max'], ['languages', 0.3, 'max'], ['memoryLaw', 0.2, 'max']],
    CC: [['incomeTax', 0.45, 'max'], ['antiCorruption', 0.6, 'min'], ['dialogue', 0.35, 'max']],
  };

  G.SCENARIOS = G.SCENARIOS || {};
  G.SCENARIOS.spain = S;
})(typeof window !== 'undefined' ? window : globalThis);
