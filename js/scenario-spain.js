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
  const nf = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const pct = (x, d = 1) => nf(x, d) + ' %';
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
      name: 'Crecimiento económico', local: '', cat: 'Economy', init: 0.55, inertia: 0.35, good: 'high',
      fmt: (v) => nf(v * 10 - 3) + ' %', unit: 'crecimiento real del PIB al año',
      desc: 'Crecimiento real del PIB. Impulsa el empleo, la recaudación y el ánimo general.',
      fx: 'unemployment -0.32, investment 0.22, poverty -0.06, crime -0.03, everyone 0.25, selfEmployed 0.2, wealthy 0.12, inflation 0.1, emissions 0.05, immigration 0.15, housing 0.06, energy 0.03',
    },
    unemployment: {
      name: 'Paro', local: '', cat: 'Economy', init: 0.35, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 30), unit: 'de la población activa',
      desc: 'Parte de la población activa sin trabajo. El paro juvenil suele duplicar la media.',
      fx: 'poverty 0.3, crime 0.07, inequality 0.1, everyone -0.3, workers -0.3, youth -0.3, unemployed -0.15, growth -0.06, birthrate -0.08, immigration -0.1, precarity 0.05',
    },
    inflation: {
      name: 'Inflación', local: '', cat: 'Economy', init: 0.3, inertia: 0.35, good: 'low',
      fmt: (v) => pct(v * 10 - 0.5), unit: 'subida anual de los precios (IPC)',
      desc: 'Subida de los precios de consumo. Erosiona los salarios; las pensiones se revalorizan con ella.',
      fx: 'everyone -0.3, lowIncome -0.3, pensioners -0.1, poverty 0.08, growth -0.05, housing 0.05, investment -0.06, wealthy 0.024',
    },
    investment: {
      name: 'Confianza empresarial', local: '', cat: 'Economy', init: 0.55, inertia: 0.3, good: 'high',
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'índice de confianza',
      desc: 'Disposición de las empresas a invertir y contratar.',
      fx: 'growth 0.22, unemployment -0.08, wealthy 0.1, selfEmployed 0.08',
    },
    productivity: {
      name: 'Productividad e innovación', local: '', cat: 'Economy', init: 0.4, inertia: 0.12, good: 'high',
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'índice de innovación',
      desc: 'Cuánto produce cada trabajador. Sube despacio, pero lo mejora todo.',
      fx: 'growth 0.18, investment 0.06, unemployment -0.03, wealthy 0.05',
    },
    precarity: {
      name: 'Temporalidad', local: '', cat: 'Economy', init: 0.4, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 40), unit: 'de contratos temporales',
      desc: 'Trabajadores con contratos temporales o inestables.',
      fx: 'workers -0.25, youth -0.25, birthrate -0.06, productivity -0.04, poverty 0.04, selfEmployed 0.04',
    },
    tourism: {
      name: 'Turismo', local: '', cat: 'Economy', init: 0.75, inertia: 0.3, good: 'high',
      fmt: (v) => nf(v * 130, 0) + ' M', unit: 'turistas internacionales al año',
      desc: 'Visitantes internacionales. Traen empleo y crecimiento, pero presionan la vivienda y el agua.',
      fx: 'growth 0.12, unemployment -0.08, housing 0.08, tourismWorkers 0.4, water 0.03, emissions 0.03, environmentalists -0.06, tenants -0.05',
    },
    energy: {
      name: 'Precio de la luz', local: '', cat: 'Economy', init: 0.45, inertia: 0.3, good: 'low',
      fmt: (v) => nf(v * 180, 0) + ' €/MWh', unit: 'precio mayorista de la electricidad',
      desc: 'Precio mayorista de la electricidad.',
      fx: 'inflation 0.12, growth -0.08, everyone -0.12, lowIncome -0.1, selfEmployed -0.1, farmers -0.08, investment -0.05',
    },
    riskPremium: {
      name: 'Prima de riesgo', local: '', cat: 'Economy', init: 0.11, inertia: 0.3, good: 'low',
      fmt: (v) => nf(v * 600, 0) + ' pb', unit: 'diferencial con el bono alemán',
      desc: 'El interés extra que piden los mercados para prestar a España. Sube con la deuda y el déficit.',
      fx: 'growth -0.15, investment -0.15, wealthy -0.08, everyone -0.05',
    },
    housing: {
      name: 'Coste de la vivienda', local: '', cat: 'Society', init: 0.7, inertia: 0.18, good: 'low',
      fmt: (v) => pct(v * 55, 0), unit: 'de los ingresos se va en alquiler',
      desc: 'Parte de los ingresos que se va en pagar el alquiler.',
      fx: 'tenants -0.6, youth -0.45, parents -0.1, everyone -0.08, wealthy 0.21, birthrate -0.1, poverty 0.08, inequality 0.04, depopulation -0.06',
    },
    poverty: {
      name: 'Riesgo de pobreza', local: '', cat: 'Society', init: 0.5, inertia: 0.25, good: 'low',
      fmt: (v) => pct(v * 52), unit: 'en riesgo de pobreza o exclusión',
      desc: 'Personas en riesgo de pobreza o exclusión social (tasa AROPE).',
      fx: 'lowIncome -0.35, crime 0.08, health -0.04, education -0.04, birthrate -0.03, everyone -0.05',
    },
    inequality: {
      name: 'Desigualdad', local: '', cat: 'Society', init: 0.55, inertia: 0.15, good: 'low',
      fmt: (v) => nf(0.25 + v * 0.12, 3), unit: 'índice de Gini',
      desc: 'Desigualdad de ingresos (índice de Gini).',
      fx: 'lowIncome -0.25, workers -0.12, crime 0.06, growth -0.02',
    },
    crime: {
      name: 'Criminalidad', local: '', cat: 'Society', init: 0.3, inertia: 0.25, good: 'low',
      fmt: (v) => nf(v * 150, 0) + '/1000', unit: 'infracciones por cada mil habitantes',
      desc: 'Delitos registrados por habitante.',
      fx: 'everyone -0.25, pensioners -0.2, patriots -0.15, parents -0.1, tourism -0.06, investment -0.04',
    },
    health: {
      name: 'Sanidad', local: '', cat: 'Society', init: 0.6, inertia: 0.2, good: 'high',
      fmt: (v) => nf((1 - v) * 300, 0) + ' días', unit: 'de espera media para operarse',
      desc: 'Calidad de la sanidad pública, medida por las listas de espera quirúrgicas.',
      fx: 'everyone 0.25, pensioners 0.25, parents 0.08',
    },
    education: {
      name: 'Educación', local: '', cat: 'Society', init: 0.5, inertia: 0.1, good: 'high',
      fmt: (v) => nf(400 + v * 150, 0), unit: 'puntuación PISA',
      desc: 'Calidad del sistema educativo. Cambia despacio y marca la productividad de una generación.',
      fx: 'productivity 0.15, growth 0.02, parents 0.15, youth 0.08, crime -0.03, inequality -0.03',
    },
    birthrate: {
      name: 'Natalidad', local: '', cat: 'Society', init: 0.23, inertia: 0.1, good: 'high',
      fmt: (v) => nf(0.8 + v * 1.4, 2), unit: 'hijos por mujer',
      desc: 'Número medio de hijos por mujer.',
      fx: 'parents 0.1, catholics 0.1, growth 0.02',
    },
    gender: {
      name: 'Igualdad de género', local: '', cat: 'Society', init: 0.65, inertia: 0.15, good: 'high',
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'índice de igualdad',
      desc: 'Brecha salarial, representación y protección frente a la violencia de género.',
      fx: 'feminists 0.3, birthrate 0.02, catholics -0.03',
    },
    liberty: {
      name: 'Libertades civiles', local: '', cat: 'Society', init: 0.65, inertia: 0.25, good: 'high',
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'índice de libertades',
      desc: 'Libertad de manifestación, de expresión y de privacidad.',
      fx: 'secular 0.1, youth 0.08, everyone 0.03',
    },
    corruption: {
      name: 'Corrupción', local: '', cat: 'Society', init: 0.45, inertia: 0.2, good: 'low',
      fmt: (v) => nf((1 - v) * 100, 0) + '/100', unit: 'transparencia (más alto, más limpio)',
      desc: 'Corrupción percibida. Los escándalos pueden tumbar gobiernos.',
      fx: 'everyone -0.25, investment -0.08, growth -0.02',
    },
    immigration: {
      name: 'Inmigración', local: '', cat: 'Society', init: 0.55, inertia: 0.25, good: null,
      fmt: (v) => nf(v * 1000, 0) + ' mil', unit: 'llegadas netas al año',
      desc: 'Migración neta. Cubre vacantes y rejuvenece la población, pero divide a la opinión pública.',
      fx: 'growth 0.05, unemployment 0.02, birthrate 0.03, housing 0.05, depopulation -0.03, patriots -0.25, immigrants 0.1, workers -0.04',
    },
    emissions: {
      name: 'Emisiones de CO₂', local: '', cat: 'Environment', init: 0.5, inertia: 0.15, good: 'low',
      fmt: (v) => nf(v * 520, 0) + ' Mt', unit: 'gases de efecto invernadero al año',
      desc: 'Emisiones de gases de efecto invernadero.',
      fx: 'health -0.05, water 0.05, environmentalists -0.45, youth -0.05',
    },
    renewables: {
      name: 'Renovables', local: '', cat: 'Environment', init: 0.57, inertia: 0.12, good: 'high',
      fmt: (v) => pct(v * 100, 0), unit: 'de la electricidad',
      desc: 'Parte de la electricidad que procede del viento, el sol y el agua.',
      fx: 'energy -0.12, emissions -0.15, environmentalists 0.15, investment 0.02',
    },
    water: {
      name: 'Sequía', local: '', cat: 'Environment', init: 0.55, inertia: 0.2, good: 'low',
      fmt: (v) => pct((1 - v) * 100, 0), unit: 'de capacidad de los embalses',
      desc: 'Presión sobre el agua. El cambio climático seca cada vez más el sur y el este.',
      fx: 'farmers -0.45, rural -0.15, environmentalists -0.15, everyone -0.08, growth -0.04, energy 0.03, tourism -0.02',
    },
    depopulation: {
      name: 'España vaciada', local: '', cat: 'Environment', init: 0.6, inertia: 0.1, good: 'low',
      fmt: (v) => pct(v * 100, 0), unit: 'de municipios pierden población',
      desc: 'Despoblación del interior. Cuanta más gente se concentra en las ciudades, más cara es allí la vivienda.',
      fx: 'rural -0.45, farmers -0.15, growth -0.02, housing 0.15',
    },
    infrastructure: {
      name: 'Infraestructuras', local: '', cat: 'Environment', init: 0.65, inertia: 0.1, good: 'high',
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'índice de infraestructuras',
      desc: 'Carreteras, tren, red eléctrica y banda ancha.',
      fx: 'growth 0.05, tourism 0.03, depopulation -0.04, everyone 0.03, rural 0.08',
    },
    tension: {
      name: 'Tensión territorial', local: '', cat: 'Society', init: 0.5, inertia: 0.2, good: 'low',
      fmt: (v) => pct(20 + v * 40, 0), unit: 'apoyo a la independencia de Cataluña',
      desc: 'Presión independentista en Cataluña y, en menor medida, en el País Vasco.',
      fx: 'patriots -0.3, catholics -0.05, everyone -0.04, investment -0.08, growth -0.02',
    },

    /* Forces beyond your control. `drive` sets how each moves every quarter:
     *   target = mean + trend × quarter + amp × sin(cycle);  v += rev × (target − v) + vol × noise */
    world: {
      name: 'Economía mundial', local: '', cat: 'World', init: 0.5, inertia: 1, good: 'high', external: true,
      drive: { mean: 0.5, amp: 0.05, period: 30, phase: 3, rev: 0.15, vol: 0.025, min: 0.2, max: 0.8 },
      fmt: (v) => (v > 0.58 ? 'En auge' : v > 0.52 ? 'Fuerte' : v > 0.47 ? 'Estable' : v > 0.4 ? 'Débil' : 'Recesión'), unit: 'demanda mundial',
      desc: 'El ciclo económico global. No puedes controlarlo, solo prepararte.',
      fx: 'growth 0.5, tourism 0.25, investment 0.2, energy 0.15',
    },
    climate: {
      name: 'Cambio climático', local: '', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.0035, rev: 1 },
      fmt: (v) => '+' + nf(1.3 + (v - 0.5) * 4, 2) + ' °C', unit: 'calentamiento global',
      desc: 'El calentamiento global agrava las sequías y las olas de calor.',
      fx: 'water 0.6, energy 0.05, tourism -0.05, farmers -0.1',
    },
    ageing: {
      name: 'Envejecimiento', local: '', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.0018, rev: 1 },
      fmt: (v) => pct(20.5 + (v - 0.5) * 40), unit: 'de la población tiene 65 años o más',
      desc: 'Cada año se jubila más gente. Suben el gasto en pensiones y en sanidad.',
      fx: 'growth -0.15, depopulation 0.15, health -0.2',
    },
    ecbRates: {
      name: 'Tipos del BCE', local: '', cat: 'World', init: 0.4, inertia: 1, good: null, external: true,
      drive: { mean: 0.4, amp: 0.08, period: 36, phase: 20, rev: 0.12, vol: 0.025, min: 0, max: 1 },
      fmt: (v) => pct(v * 5, 2), unit: 'tipo de depósito del BCE',
      desc: 'Los fija Fráncfort para toda la eurozona. Si suben, se enfría la inflación pero se encarecen las hipotecas y la deuda.',
      fx: 'growth -0.12, inflation -0.1, investment -0.08, housing -0.04, parents -0.06, everyone -0.04, wealthy 0.03',
    },
    oilPrice: {
      name: 'Petróleo y gas', local: '', cat: 'World', init: 0.45, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.45, rev: 0.12, vol: 0.045, min: 0.1, max: 1 },
      fmt: (v) => nf(30 + v * 100, 0) + ' $/barril', unit: 'petróleo Brent',
      desc: 'España importa casi todos sus combustibles fósiles.',
      fx: 'energy 0.25, inflation 0.1, growth -0.06, everyone -0.06, farmers -0.08',
    },
    geopolitics: {
      name: 'Tensión geopolítica', local: '', cat: 'World', init: 0.5, inertia: 1, good: 'low', external: true,
      drive: { mean: 0.5, trend: 0.001, rev: 0.08, vol: 0.035, min: 0.1, max: 1 },
      fmt: (v) => (v > 0.75 ? 'Prebélica' : v > 0.6 ? 'Muy alta' : v > 0.48 ? 'Alta' : v > 0.35 ? 'Moderada' : 'Calma'), unit: 'riesgo de conflicto internacional',
      desc: 'Guerras, conflictos comerciales y presión de los aliados.',
      fx: 'energy 0.06, tourism -0.04, investment -0.05, patriots -0.06, immigration 0.03',
    },
    migrationPressure: {
      name: 'Presión migratoria', local: '', cat: 'World', init: 0.5, inertia: 1, good: null, external: true,
      drive: { mean: 0.5, rev: 0.1, vol: 0.04, min: 0.1, max: 1 },
      fmt: (v) => (v > 0.7 ? 'Extrema' : v > 0.58 ? 'Alta' : v > 0.42 ? 'Normal' : 'Baja'), unit: 'crisis en otros países',
      desc: 'Conflictos, sequías y crisis económicas en otros países empujan a la gente hacia España.',
      fx: 'immigration 0.35, patriots -0.05',
    },
    automation: {
      name: 'IA y automatización', local: '', cat: 'World', init: 0.3, inertia: 1, good: null, external: true,
      drive: { mean: 0.3, trend: 0.006, rev: 1, max: 1 },
      fmt: (v) => nf(v * 100, 0) + ' pts', unit: 'adopción de la IA en la economía',
      desc: 'La IA y los robots llegan a oficinas y fábricas: sube la productividad, pero desaparecen algunos empleos.',
      fx: 'productivity 0.2, investment 0.06, unemployment 0.06, precarity 0.05, workers -0.06, youth -0.03',
    },
    euFunds: {
      name: 'Fondos europeos', local: '', cat: 'World', init: 0.6, inertia: 1, good: 'high', external: true,
      drive: { mean: 0.6, trend: -0.02, rev: 1, min: 0.2 },
      fmt: (v) => nf(v * 25, 0) + ' mil M€/año', unit: 'dinero europeo que llega',
      desc: 'Dinero de la UE para inversión y recuperación.',
      fx: 'growth 0.08, investment 0.1, infrastructure 0.04, renewables 0.03',
    },
    realWage: {
      name: 'Poder adquisitivo', local: '', cat: 'Economy', init: 0.5, inertia: 1, good: 'high', external: true, hidden: true, drawer: 'wage',
      fmt: (v) => (v >= 0.5 ? '+' : '') + nf((v - 0.5) / 2.5 * 100) + ' %', unit: 'variación del poder adquisitivo',
      desc: 'Lo que compra el salario medio después de la inflación.',
      fx: 'workers 0.35, everyone 0.15, youth 0.1, tenants 0.1, publicSector 0.1',
    },
    debtRatio: {
      name: 'Deuda / PIB', local: '', cat: 'World', init: 1.02, inertia: 1, good: 'low', external: true, hidden: true,
      fmt: (v) => pct(v * 100, 0), unit: 'del PIB',
      desc: 'Deuda pública sobre el PIB.',
      fx: 'riskPremium 0.5 sq',
    },
    deficitRatio: {
      name: 'Déficit / PIB', local: '', cat: 'World', init: 0.28, inertia: 1, good: 'low', external: true, hidden: true,
      fmt: (v) => pct(v * 10, 1), unit: 'del PIB',
      desc: 'Déficit público.',
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
    everyone: { name: 'Todos los votantes', local: '', size: 1, lr: 0, cen: 0, start: 0.5, hidden: true },
    pensioners: { name: 'Jubilados', local: '', size: 0.24, lr: 0.12, cen: 0.1, start: 0.55, age: 'old',
      sizeFx: 'ageing 2.5, retirementAge -0.4',
      desc: 'Más de una quinta parte del electorado y los que más votan. Les importan sobre todo las pensiones y la sanidad.' },
    youth: { name: 'Jóvenes', local: '', size: 0.15, lr: -0.25, cen: -0.05, start: 0.4, age: 'young',
      sizeFx: 'ageing -1.2, immigration 0.3, unemployment -0.5',
      desc: 'Los golpean el alquiler, la precariedad y el paro. Votan menos que la media.' },
    parents: { name: 'Familias con hijos', local: '', size: 0.3, lr: 0.05, cen: 0, start: 0.48,
      sizeFx: 'birthrate 1.5, housing -0.3',
      desc: 'Colegios, guarderías, vivienda y seguridad.' },
    workers: { name: 'Trabajadores y sindicatos', local: '', size: 0.4, lr: -0.25, cen: 0, start: 0.5,
      sizeFx: 'unemployment -0.6, automation -0.25, immigration 0.15',
      desc: 'Asalariados. Quieren un salario mínimo más alto, jornadas más cortas y protección laboral.' },
    unemployed: { name: 'Parados', local: '', size: 0.105, lr: -0.2, cen: 0, start: 0.35,
      sizeFx: 'unemployment 2.86',
      desc: 'Personas que buscan trabajo sin encontrarlo.' },
    lowIncome: { name: 'Rentas bajas', local: '', size: 0.25, lr: -0.3, cen: 0, start: 0.42,
      sizeFx: 'poverty 2',
      desc: 'Hogares cerca del umbral de la pobreza.' },
    selfEmployed: { name: 'Autónomos y pymes', local: '', size: 0.14, lr: 0.35, cen: 0.1, start: 0.45,
      sizeFx: 'smeSupport 0.3, socialContrib -0.3, investment 0.4, automation 0.1',
      desc: 'Rechazan las cuotas altas, la burocracia y las subidas del salario mínimo.' },
    wealthy: { name: 'Rentas altas y propietarios', local: '', size: 0.12, lr: 0.45, cen: 0.1, start: 0.52, age: 'oldBias',
      sizeFx: 'inequality 1.2, growth 0.4, housing 0.4',
      desc: 'Grandes ingresos y dueños de varias viviendas. Sensibles a los impuestos sobre el patrimonio y la herencia y al control del alquiler.' },
    publicSector: { name: 'Funcionarios', local: '', size: 0.13, lr: -0.15, cen: 0, start: 0.55,
      sizeFx: 'civilService 0.8',
      desc: 'Profesores, médicos, policías y personal administrativo.' },
    farmers: { name: 'Agricultores', local: '', size: 0.03, lr: 0.3, cen: 0.2, start: 0.4, ruralBoost: 4,
      sizeFx: 'depopulation -0.8, water -0.6, farmSubsidy 0.3, freeTrade -0.2',
      desc: 'Olivares, viñedos e invernaderos. Muy expuestos a la sequía; famosos por sus tractoradas.' },
    rural: { name: 'España vaciada', local: '', size: 0, lr: 0.15, cen: 0.15, start: 0.42, ruralShare: true,
      sizeFx: 'depopulation -1.2, remoteWork 0.15, ruralPlan 0.2',
      desc: 'Quienes viven en el interior que se despuebla: servicios, transporte y conexión.' },
    catholics: { name: 'Católicos practicantes', local: '', size: 0.17, lr: 0.5, cen: 0.2, start: 0.5, age: 'oldBias',
      sizeFx: 'time -0.12, immigration 0.1',
      desc: 'Valoran la escuela concertada, el apoyo a las familias y la financiación de la Iglesia.' },
    secular: { name: 'Progresistas laicos', local: '', size: 0.33, lr: -0.32, cen: -0.05, start: 0.52, age: 'youngBias',
      sizeFx: 'time 0.06',
      desc: 'Quieren un Estado aconfesional y más derechos civiles.' },
    environmentalists: { name: 'Ecologistas y animalistas', local: '', size: 0.2, lr: -0.38, cen: -0.05, start: 0.48, age: 'youngBias',
      sizeFx: 'climate 1.5, water 0.5, emissions 0.4, time 0.05',
      desc: 'Clima, agua, biodiversidad y bienestar animal.' },
    feminists: { name: 'Feministas', local: '', size: 0.22, lr: -0.35, cen: 0, start: 0.55,
      sizeFx: 'gender 0.3, time 0.04',
      desc: 'Igualdad salarial, corresponsabilidad y lucha contra la violencia machista.' },
    patriots: { name: 'Patriotas', local: '', size: 0.22, lr: 0.5, cen: 0.9, start: 0.45, region: { CAT: 0.1, PV: 0.08, NAV: 0.15, GAL: 0.15 },
      sizeFx: 'tension 0.6, immigration 0.4, geopolitics 0.3',
      desc: 'Defienden la unidad nacional, la monarquía y las tradiciones. Rechazan las concesiones a los independentistas.' },
    catalanNat: { name: 'Independentistas catalanes', local: '', size: 0, lr: -0.05, cen: -1, start: 0.45, region: { CAT: 0.48, BAL: 0.06, VAL: 0.04 },
      sizeFx: 'tension 1.2, recentralisation 0.5, dialogue -0.2, catalanFiscal -0.15',
      desc: 'Quieren autodeterminación, autonomía fiscal y protección del catalán.' },
    basqueNat: { name: 'Nacionalistas vascos', local: '', size: 0, lr: -0.05, cen: -1, start: 0.52, region: { PV: 0.5, NAV: 0.22 },
      sizeFx: 'tension 0.3, recentralisation 0.3',
      desc: 'Defienden el autogobierno vasco y el concierto económico.' },
    immigrants: { name: 'Nuevos españoles', local: '', size: 0.07, lr: -0.15, cen: 0.05, start: 0.5,
      sizeFx: 'immigration 1.2, regularisation 0.3, time 0.15',
      desc: 'Votantes nacionalizados, sobre todo latinoamericanos.' },
    tenants: { name: 'Inquilinos', local: '', size: 0.2, lr: -0.2, cen: 0, start: 0.38, age: 'youngStrong',
      sizeFx: 'housing 1.0, publicHousing -0.3, firstHome -0.2',
      desc: 'Dedican gran parte de sus ingresos al alquiler. Se concentran en las grandes ciudades.' },
    tourismWorkers: { name: 'Sector turístico', local: '', size: 0.07, lr: 0.1, cen: 0, start: 0.6, tourismBoost: true,
      sizeFx: 'tourism 1.5',
      desc: 'Hoteles, bares y restaurantes. Enorme en las islas y en la costa.' },
    bullfighting: { name: 'Aficionados taurinos', local: '', size: 0.07, lr: 0.4, cen: 0.4, start: 0.5, region: { CAT: 0.01, PV: 0.02, GAL: 0.02, CAN: 0.01 },
      sizeFx: 'time -0.15, bullfighting 0.3',
      desc: 'Defienden la tauromaquia como patrimonio cultural.' },
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
  pol({ id: 'incomeTax', cat: 'tax', name: 'Impuesto sobre la renta (IRPF)', local: '', init: 0.5, intro: 30, budget: ['rev', 262, 'wagesProg'], lr: -0.25,
    levels: ['Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto'],
    desc: 'Impuesto progresivo sobre los ingresos de las personas. Es el gran impuesto del Estado y se comparte con las comunidades.',
    fx: 'growth -0.08, investment -0.05, inequality -0.15, wealthy -0.35, selfEmployed -0.15, workers -0.08, everyone -0.08' });
  pol({ id: 'vat', cat: 'tax', name: 'IVA', local: '', init: 0.5, intro: 30, budget: ['rev', 184, 'consumption'], lr: 0.05,
    levels: ['10 %', '15 %', '21 %', '25 %', '28 %'],
    desc: 'Impuesto sobre el consumo. Regresivo: pesa más sobre quien menos tiene.',
    fx: 'inflation 0.08, poverty 0.08, inequality 0.06, growth -0.04, tourism -0.04, lowIncome -0.2, selfEmployed -0.1, everyone -0.05' });
  pol({ id: 'corpTax', cat: 'tax', name: 'Impuesto de Sociedades', local: '', init: 0.5, intro: 25, budget: ['rev', 78, 'profits'], lr: -0.25,
    levels: ['15 %', '20 %', '25 %', '30 %', '35 %'],
    desc: 'Impuesto sobre los beneficios de las empresas.',
    fx: 'investment -0.2, growth -0.06, unemployment 0.03, productivity -0.04, selfEmployed -0.2, wealthy -0.15, workers 0.05' });
  pol({ id: 'socialContrib', cat: 'tax', name: 'Cotizaciones sociales', local: '', init: 0.5, intro: 30, budget: ['rev', 390, 'wages'], lr: -0.15,
    levels: ['Muy bajas', 'Bajas', 'Normales', 'Altas', 'Muy altas'],
    desc: 'Lo que pagan empresas, trabajadores y autónomos para financiar las pensiones.',
    fx: 'unemployment 0.08, precarity 0.05, investment -0.08, selfEmployed -0.3, workers -0.05, pensioners 0.08' });
  pol({ id: 'wealthTax', cat: 'tax', name: 'Impuesto sobre el Patrimonio', local: '', init: 0.5, intro: 20, budget: ['rev', 5, 'gdp'], lr: -0.4,
    levels: ['Simbólico', 'Ligero', 'Normal', 'Fuerte', 'Confiscatorio'],
    desc: 'Impuesto anual sobre las grandes fortunas.',
    fx: 'inequality -0.05, investment -0.06, wealthy -0.36, lowIncome 0.05, workers 0.04' });
  pol({ id: 'inheritanceTax', cat: 'tax', name: 'Impuesto de Sucesiones', local: '', init: 0.3, intro: 20, budget: ['rev', 10, 'gdp'], lr: -0.25,
    levels: ['Casi nulo', 'Ligero', 'Moderado', 'Fuerte', 'Muy fuerte'],
    desc: 'Impuesto sobre herencias y donaciones.',
    fx: 'inequality -0.05, wealthy -0.272, pensioners -0.1, farmers -0.08, catholics -0.04' });
  pol({ id: 'fuelTax', cat: 'tax', name: 'Impuesto sobre los carburantes', local: '', init: 0.5, intro: 20, budget: ['rev', 26, 'consumption'], lr: -0.1,
    levels: ['Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto'],
    desc: 'Impuesto especial sobre la gasolina y el gasóleo.',
    fx: 'emissions -0.08, inflation 0.04, energy 0.03, everyone -0.09, farmers -0.15, rural -0.12, environmentalists 0.15' });
  pol({ id: 'sinTax', cat: 'tax', name: 'Impuestos al alcohol y al tabaco', local: '', init: 0.5, intro: 15, budget: ['rev', 18, 'consumption'],
    levels: ['Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto'],
    desc: 'Impuestos especiales sobre bebidas alcohólicas y tabaco.',
    fx: 'health 0.04, crime 0.02, lowIncome -0.05, everyone -0.02' });
  pol({ id: 'touristTax', cat: 'tax', name: 'Tasa turística', local: '', init: 0.25, intro: 20, budget: ['rev', 2.5, 'tourism'], lr: -0.1,
    levels: ['Simbólica', 'Baja', 'Moderada', 'Alta', 'Muy alta'],
    desc: 'Cargo por cada noche de estancia turística.',
    fx: 'tourism -0.08, housing -0.03, tourismWorkers -0.2, selfEmployed -0.05, environmentalists 0.05' });
  pol({ id: 'windfallTax', cat: 'tax', name: 'Gravamen a banca y energéticas', local: '', init: 0.5, intro: 20, budget: ['rev', 6, 'profits'], lr: -0.35,
    levels: ['Ligero', 'Moderado', 'Normal', 'Fuerte', 'Muy fuerte'],
    desc: 'Impuesto sobre los beneficios extraordinarios de bancos y eléctricas.',
    fx: 'investment -0.06, energy 0.02, inequality -0.02, wealthy -0.1, workers 0.06, lowIncome 0.04' });
  pol({ id: 'carbonTax', cat: 'tax', name: 'Impuesto sobre el carbono', local: '', init: null, intro: 35, budget: ['rev', 25, 'gdp'], lr: -0.2,
    levels: ['20 €/t', '40 €/t', '60 €/t', '80 €/t', '100 €/t'],
    desc: 'Impuesto sobre las emisiones de CO₂ de toda la economía.',
    fx: 'emissions -0.2, renewables 0.1, energy 0.12, inflation 0.04, growth -0.04, environmentalists 0.35, everyone -0.045, farmers -0.2, selfEmployed -0.1' });
  pol({ id: 'taxFraud', cat: 'tax', popularTax: true, name: 'Lucha contra el fraude fiscal', local: '', init: 0.5, intro: 20, budget: ['rev', 14, 'wages'], lr: -0.1,
    levels: ['Laxa', 'Básica', 'Normal', 'Dura', 'Implacable'],
    desc: 'Inspectores de Hacienda contra la economía sumergida.',
    fx: 'corruption -0.1, workers 0.03, selfEmployed -0.12, wealthy -0.08' });

  // ── Economy & labour ─────────────────────────────────────────
  pol({ id: 'minWage', cat: 'economy', name: 'Salario mínimo (SMI)', local: '', init: 0.55, intro: 25, lr: -0.35,
    fmtLevel: (v) => Math.round(800 + v * 700) + ' € × 14 pagas',
    desc: 'Salario mínimo legal. Subirlo mejora los sueldos bajos; demasiado alto puede costar empleo.',
    fx: 'poverty -0.12, inequality -0.08, precarity -0.03, unemployment 0.07 sq, inflation 0.04, investment -0.06, workers 0.3, lowIncome 0.25, youth 0.08, selfEmployed -0.3' });
  pol({ id: 'workWeek', cat: 'economy', name: 'Jornada laboral', local: '', init: 0, intro: 35, budget: ['spend', 3, 'gdp'], lr: -0.3,
    fmtLevel: (v) => nf(40 - v * 5, 1) + ' horas semanales',
    desc: 'Jornada máxima legal. Los sindicatos quieren reducirla sin bajar los sueldos; las empresas se resisten.',
    fx: 'productivity 0.05 sqrt, growth -0.05, unemployment -0.02, birthrate 0.02, investment -0.08, workers 0.25, parents 0.1, selfEmployed -0.3' });
  pol({ id: 'labourProtection', cat: 'economy', name: 'Protección laboral', local: '', init: 0.6, intro: 30, lr: -0.3,
    levels: ['Desregulada', 'Flexible', 'Equilibrada', 'Protectora', 'Rígida'],
    desc: 'Coste del despido, límites a la temporalidad y negociación colectiva.',
    fx: 'precarity -0.2, unemployment 0.04, growth -0.03, investment -0.08, workers 0.2, youth 0.05, selfEmployed -0.2' });
  pol({ id: 'industrialPolicy', cat: 'economy', name: 'Política industrial', local: '', init: 0.4, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.1,
    levels: ['Mínima', 'Selectiva', 'Activa', 'Ambiciosa', 'Dirigida por el Estado'],
    desc: 'Ayudas a sectores estratégicos como los chips, las baterías o la automoción.',
    fx: 'productivity 0.08, unemployment -0.04, growth 0.04, investment 0.05, workers 0.1' });
  pol({ id: 'rnd', cat: 'economy', name: 'I+D+i', local: '', init: 0.4, intro: 25, budget: ['spend', 20, 'gdp'],
    levels: ['Raquítica', 'Baja', 'Media', 'Alta', 'De primer nivel'],
    desc: 'Financiación pública de la investigación.',
    fx: 'productivity 0.2 sqrt, growth 0.04, education 0.03, investment 0.05, youth 0.08' });
  pol({ id: 'smeSupport', cat: 'economy', name: 'Apoyo a autónomos y pymes', local: '', init: 0.5, intro: 20, budget: ['spend', 6, 'gdp'], lr: 0.1,
    levels: ['Ninguno', 'Básico', 'Moderado', 'Generoso', 'Muy generoso'],
    desc: 'Tarifa plana, créditos baratos y ayudas a las pequeñas empresas.',
    fx: 'unemployment -0.04, investment 0.05, selfEmployed 0.3, youth 0.04' });
  pol({ id: 'farmSubsidy', cat: 'economy', name: 'Ayudas al campo', local: '', init: 0.5, intro: 20, budget: ['spend', 14, 'gdp'], lr: 0.05,
    levels: ['Mínimo europeo', 'Bajas', 'Moderadas', 'Altas', 'Muy altas'],
    desc: 'Complemento nacional a las ayudas europeas a la agricultura.',
    fx: 'depopulation -0.06, water 0.06, emissions 0.03, farmers 0.45, rural 0.15, environmentalists -0.06' });
  pol({ id: 'tourismPromo', cat: 'economy', name: 'Promoción turística', local: '', init: 0.5, intro: 15, budget: ['spend', 0.4, 'gdp'], lr: 0.05,
    levels: ['Ninguna', 'Baja', 'Moderada', 'Alta', 'Agresiva'],
    desc: 'Promoción de España en el exterior y apoyo a la hostelería.',
    fx: 'tourism 0.12, housing 0.04, unemployment -0.03, tourismWorkers 0.2, environmentalists -0.06, tenants -0.04' });
  pol({ id: 'publicEnergy', cat: 'economy', name: 'Eléctrica pública', local: '', init: null, intro: 45, budget: ['spend', 6, 'gdp'], lr: -0.5,
    levels: ['Pequeña', 'Modesta', 'Importante', 'Grande', 'Dominante'],
    desc: 'Una compañía eléctrica estatal que compita con las grandes.',
    fx: 'energy -0.08, investment -0.08, renewables 0.04, workers 0.1, lowIncome 0.06, wealthy -0.1, environmentalists 0.05' });

  // ── Welfare ──────────────────────────────────────────────────
  pol({ id: 'pensions', cat: 'welfare', name: 'Revalorización de las pensiones', local: '', init: 0.65, intro: 40, budget: ['spend', 300, 'ageing'], lr: -0.15,
    fmtLevel: (v) => (v < 0.15 ? 'Congeladas' : v < 0.45 ? 'Por debajo del IPC' : v < 0.8 ? 'Según el IPC' : 'Por encima del IPC'),
    desc: 'La mayor partida del gasto público. Congelarlas es un suicidio político; ser generoso tensa las cuentas a medida que se jubila más gente.',
    fx: 'poverty -0.08, growth 0.02, pensioners 0.55, youth -0.05, wealthy -0.04' });
  pol({ id: 'retirementAge', cat: 'welfare', name: 'Edad de jubilación', local: '', init: 0.6, intro: 40, budget: ['spend', -32, 'ageing'], lr: 0.2,
    fmtLevel: (v) => nf(63 + v * 6, 1) + ' años',
    desc: 'Edad legal de jubilación. Subirla ahorra dinero, pero enfada a los trabajadores y a quienes están a punto de jubilarse.',
    fx: 'unemployment 0.02, growth 0.02, pensioners -0.25, workers -0.25, youth -0.05' });
  pol({ id: 'unemploymentBenefit', cat: 'welfare', name: 'Prestación por desempleo', local: '', init: 0.55, intro: 25, budget: ['spend', 42, 'unemp'], lr: -0.2,
    levels: ['Mínima', 'Básica', 'Moderada', 'Generosa', 'Muy generosa'],
    desc: 'Ingresos para quienes pierden su empleo.',
    fx: 'poverty -0.1, unemployment 0.03, precarity -0.02, unemployed 0.5, workers 0.08, selfEmployed -0.06' });
  pol({ id: 'minimumIncome', cat: 'welfare', name: 'Ingreso mínimo vital', local: '', init: 0.4, intro: 30, budget: ['spend', 11, 'gdp'], lr: -0.35,
    levels: ['Mínimo', 'Básico', 'Moderado', 'Generoso', 'Universal'],
    desc: 'Renta garantizada para los hogares más pobres.',
    fx: 'poverty -0.2 sqrt, inequality -0.08, crime -0.04, unemployment 0.02, lowIncome 0.3, unemployed 0.1, selfEmployed -0.06, wealthy -0.04' });
  pol({ id: 'childBenefit', cat: 'welfare', name: 'Prestación por hijo', local: '', init: 0.25, intro: 25, budget: ['spend', 16, 'gdp'], lr: -0.05,
    levels: ['Mínima', 'Básica', 'Moderada', 'Generosa', 'Muy generosa'],
    desc: 'Ayudas económicas a las familias con hijos.',
    fx: 'birthrate 0.18, poverty -0.05, parents 0.35, catholics 0.08' });
  pol({ id: 'longTermCare', cat: 'welfare', name: 'Dependencia', local: '', init: 0.45, intro: 25, budget: ['spend', 22, 'ageing'], lr: -0.15,
    levels: ['Mínima', 'Básica', 'Moderada', 'Generosa', 'Universal'],
    desc: 'Cuidados para mayores y personas dependientes.',
    fx: 'health 0.04, gender 0.04, unemployment -0.02, pensioners 0.15, feminists 0.08, publicSector 0.04' });
  pol({ id: 'parentalLeave', cat: 'welfare', name: 'Permisos de nacimiento', local: '', init: 0.55, intro: 20, budget: ['spend', 7, 'gdp'], lr: -0.15,
    fmtLevel: (v) => Math.round(8 + v * 24) + ' semanas por progenitor',
    desc: 'Permisos retribuidos, iguales e intransferibles para ambos progenitores.',
    fx: 'birthrate 0.06, gender 0.1, parents 0.25, feminists 0.15, selfEmployed -0.08' });

  // ── Public services ──────────────────────────────────────────
  pol({ id: 'healthcare', cat: 'services', name: 'Sanidad pública', local: '', init: 0.6, intro: 30, budget: ['spend', 172, 'ageing'], lr: -0.1,
    levels: ['Al mínimo', 'Infrafinanciada', 'Suficiente', 'Bien financiada', 'Excelente'],
    desc: 'Sistema sanitario universal, gestionado por las comunidades autónomas.',
    fx: 'health 0.5 sqrt, pensioners 0.15, everyone 0.06, publicSector 0.08, lowIncome 0.08' });
  pol({ id: 'healthOutsourcing', cat: 'services', name: 'Conciertos sanitarios', local: '', init: 0.3, intro: 25, budget: ['spend', -6, 'gdp'], lr: 0.35,
    levels: ['Ninguno', 'Limitados', 'Moderados', 'Amplios', 'Generalizados'],
    desc: 'Contratar hospitales y aseguradoras privadas para prestar la sanidad pública.',
    fx: 'health 0.08, corruption 0.04, wealthy 0.08, publicSector -0.15, workers -0.05' });
  pol({ id: 'education', cat: 'services', name: 'Educación pública', local: '', init: 0.55, intro: 30, budget: ['spend', 120, 'gdp'], lr: -0.1,
    levels: ['Al mínimo', 'Infrafinanciada', 'Suficiente', 'Bien financiada', 'Excelente'],
    desc: 'Colegios, institutos y universidades públicos.',
    fx: 'education 0.45 sqrt, productivity 0.06, inequality -0.04, parents 0.2, youth 0.1, publicSector 0.08' });
  pol({ id: 'charterSchools', cat: 'services', name: 'Escuela concertada', local: '', init: 0.5, intro: 25, budget: ['spend', 14, 'gdp'], lr: 0.3,
    levels: ['Eliminada', 'Reducida', 'Normal', 'Ampliada', 'Dominante'],
    desc: 'Colegios privados, en su mayoría religiosos, sostenidos con fondos públicos.',
    fx: 'education 0.03, inequality 0.04, catholics 0.3, parents 0.05, secular -0.15' });
  pol({ id: 'grants', cat: 'services', name: 'Becas', local: '', init: 0.45, intro: 15, budget: ['spend', 5, 'gdp'], lr: -0.15,
    levels: ['Mínimas', 'Básicas', 'Moderadas', 'Generosas', 'Universidad gratuita'],
    desc: 'Becas para estudiantes de familias con menos recursos.',
    fx: 'education 0.08, inequality -0.04, productivity 0.03, youth 0.2' });
  pol({ id: 'civilService', cat: 'services', name: 'Empleo público', local: '', init: 0.55, intro: 25, budget: ['spend', 50, 'gdp'], lr: -0.15,
    levels: ['Reducido', 'Pequeño', 'Moderado', 'Grande', 'Muy grande'],
    desc: 'Número y sueldo de los empleados públicos.',
    fx: 'unemployment -0.06, health 0.04, education 0.04, crime -0.02, corruption 0.02, publicSector 0.3, selfEmployed -0.1' });
  pol({ id: 'publicTransport', cat: 'services', name: 'Transporte público', local: '', init: 0.5, intro: 20, budget: ['spend', 10, 'gdp'], lr: -0.1,
    levels: ['Mínimo', 'Básico', 'Bueno', 'Subvencionado', 'Gratuito'],
    desc: 'Cercanías, autobuses y abonos con descuento.',
    fx: 'emissions -0.06, inequality -0.02, youth 0.08, workers 0.05, everyone 0.009, rural 0.03, environmentalists 0.1' });
  pol({ id: 'infrastructureInv', cat: 'services', name: 'Tren y carreteras', local: '', init: 0.55, intro: 25, budget: ['spend', 24, 'gdp'],
    levels: ['Mantenimiento', 'Baja', 'Moderada', 'Alta', 'Masiva'],
    desc: 'Alta velocidad, autovías y corredores ferroviarios.',
    fx: 'infrastructure 0.3, growth 0.03, tourism 0.04, depopulation -0.04, unemployment -0.02, emissions -0.02, corruption 0.03, rural 0.08' });
  pol({ id: 'broadband', cat: 'services', name: 'Conectividad rural', local: '', init: 0.4, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['Ninguna', 'Básica', 'Moderada', 'Extensa', 'Universal'],
    desc: 'Banda ancha en los pueblos para poder trabajar desde el interior.',
    fx: 'productivity 0.05, depopulation -0.06, infrastructure 0.04, rural 0.12, youth 0.04' });

  // ── Law & order ──────────────────────────────────────────────
  pol({ id: 'police', cat: 'law', name: 'Policía y Guardia Civil', local: '', init: 0.5, intro: 25, budget: ['spend', 24, 'gdp'], lr: 0.15,
    levels: ['Mínima', 'Baja', 'Moderada', 'Alta', 'Muy alta'],
    desc: 'Efectivos y medios de la Policía Nacional y la Guardia Civil.',
    fx: 'crime -0.25 sqrt, liberty -0.04, patriots 0.15, pensioners 0.08, catholics 0.04, publicSector 0.03' });
  pol({ id: 'securityLaw', cat: 'law', name: 'Ley de Seguridad Ciudadana', local: '', init: 0.5, intro: 25, budget: ['rev', 0.3, 'gdp'], lr: 0.35, cen: 0.1,
    levels: ['Derogada', 'Suavizada', 'Normal', 'Endurecida', 'Draconiana'],
    desc: 'Multas por protestar o por «faltar al respeto» a la policía. Sus críticos la llaman «ley mordaza».',
    fx: 'crime -0.04, liberty -0.25, tension 0.03, patriots 0.15, pensioners 0.06, youth -0.12, secular -0.1' });
  pol({ id: 'justice', cat: 'law', name: 'Medios judiciales', local: '', init: 0.4, intro: 20, budget: ['spend', 9, 'gdp'],
    levels: ['Abandonada', 'Lenta', 'Suficiente', 'Eficaz', 'Excelente'],
    desc: 'Jueces, juzgados y digitalización de la justicia.',
    fx: 'corruption -0.15, crime -0.06, liberty 0.05, everyone 0.02, selfEmployed 0.04' });
  pol({ id: 'antiCorruption', cat: 'law', name: 'Oficina Anticorrupción', local: '', init: 0.4, intro: 25, budget: ['spend', 1.5, 'gdp'],
    levels: ['Sin dientes', 'Débil', 'Moderada', 'Fuerte', 'Implacable'],
    desc: 'Investigadores independientes y transparencia en partidos y contratos públicos.',
    fx: 'corruption -0.25 sqrt, investment 0.04, everyone 0.03' });
  pol({ id: 'defence', cat: 'law', name: 'Gasto en Defensa', local: '', init: 0.42, intro: 30, budget: ['spend', 50, 'gdp'], lr: 0.25, cen: 0.1,
    fmtLevel: (v) => nf(v * 3, 1) + ' % del PIB',
    desc: 'Presupuesto de las Fuerzas Armadas. Los aliados de la OTAN presionan para que España gaste más.',
    fx: 'productivity 0.02, unemployment -0.01, patriots 0.25, catholics 0.03, environmentalists -0.05, secular -0.03' });
  pol({ id: 'borderControl', cat: 'law', name: 'Control fronterizo', local: '', init: 0.5, intro: 25, budget: ['spend', 4, 'gdp'], lr: 0.35, cen: 0.1,
    levels: ['Abierto', 'Ligero', 'Moderado', 'Estricto', 'Fortaleza'],
    desc: 'Vigilancia en el Estrecho y la ruta canaria, y las vallas de Ceuta y Melilla.',
    fx: 'immigration -0.2, liberty -0.04, crime -0.02, patriots 0.25, immigrants -0.3' });
  pol({ id: 'regularisation', cat: 'law', name: 'Regularización de inmigrantes', local: '', init: null, intro: 35, budget: ['rev', 4, 'wages'], lr: -0.4,
    levels: ['Restringida', 'Limitada', 'Amplia', 'Muy amplia', 'Universal'],
    desc: 'Papeles para los inmigrantes sin permiso que ya viven y trabajan en España.',
    fx: 'immigration 0.06, poverty -0.04, growth 0.02, crime -0.02, immigrants 0.4, patriots -0.25, workers -0.03' });
  pol({ id: 'integration', cat: 'law', name: 'Integración', local: '', init: 0.4, intro: 15, budget: ['spend', 2, 'gdp'], lr: -0.15,
    levels: ['Ninguna', 'Básica', 'Moderada', 'Fuerte', 'Integral'],
    desc: 'Clases de idioma, inserción laboral y centros de acogida.',
    fx: 'crime -0.04, poverty -0.02, immigrants 0.2, patriots -0.04' });
  pol({ id: 'cannabis', cat: 'law', name: 'Legalización del cannabis', local: '', init: null, intro: 30, budget: ['rev', 1.5, 'gdp'], lr: -0.3,
    levels: ['Solo medicinal', 'Clubes', 'Despenalizado', 'Venta legal', 'Totalmente libre'],
    desc: 'Regular la producción y la venta de cannabis.',
    fx: 'crime -0.04, health -0.02, liberty 0.06, youth 0.15, catholics -0.2, pensioners -0.1, patriots -0.06' });

  // ── Territory ────────────────────────────────────────────────
  pol({ id: 'regionalFunding', cat: 'territory', name: 'Financiación autonómica', local: '', init: 0.5, intro: 30, budget: ['spend', 30, 'gdp'], cen: -0.1,
    levels: ['Tacaña', 'Ajustada', 'Normal', 'Generosa', 'Muy generosa'],
    desc: 'Transferencias a las comunidades autónomas, que gestionan la sanidad y la educación.',
    fx: 'health 0.06, education 0.06, tension -0.06, catalanNat 0.1, rural 0.06, patriots -0.03' });
  pol({ id: 'catalanFiscal', cat: 'territory', name: 'Financiación singular para Cataluña', local: '', init: null, intro: 45, budget: ['spend', 12, 'gdp'], cen: -0.6,
    levels: ['Limitada', 'Parcial', 'Sustancial', 'Amplia', 'Como el concierto vasco'],
    desc: 'Que Cataluña recaude sus propios impuestos, como el País Vasco y Navarra.',
    fx: 'tension -0.25, catalanNat 0.45, patriots -0.4, rural -0.1, lowIncome -0.04' });
  pol({ id: 'dialogue', cat: 'territory', name: 'Diálogo territorial', local: '', init: 0.5, intro: 30, budget: ['spend', 0.05, 'gdp'], cen: -0.5,
    levels: ['Confrontación', 'Frialdad', 'Negociación', 'Indultos', 'Amnistía total'],
    desc: 'Mesas de negociación, indultos y medidas de gracia con el independentismo.',
    fx: 'tension -0.15, catalanNat 0.3, basqueNat 0.1, patriots -0.4, catholics -0.05' });
  pol({ id: 'languages', cat: 'territory', name: 'Lenguas cooficiales', local: '', init: 0.5, intro: 20, budget: ['spend', 1, 'gdp'], cen: -0.35,
    levels: ['Solo castellano', 'Toleradas', 'Promovidas', 'Prioritarias', 'Igualdad plena'],
    desc: 'Promoción del catalán, el euskera y el gallego en las instituciones, la escuela y la UE.',
    fx: 'tension -0.05, catalanNat 0.2, basqueNat 0.2, patriots -0.2' });
  pol({ id: 'recentralisation', cat: 'territory', name: 'Recentralización (art. 155)', local: '', init: null, intro: 50, budget: ['spend', 1, 'gdp'], lr: 0.3, cen: 0.8,
    levels: ['Advertencias', 'Auditorías', 'Intervención', 'Gobierno directo', 'Autonomía suspendida'],
    desc: 'Control del Estado sobre los gobiernos autonómicos que desafían la ley.',
    fx: 'tension 0.2, liberty -0.08, investment 0.02, patriots 0.45, catalanNat -0.6, basqueNat -0.35' });
  pol({ id: 'ruralPlan', cat: 'territory', name: 'Reto demográfico', local: '', init: 0.3, intro: 20, budget: ['spend', 6, 'gdp'],
    levels: ['Simbólico', 'Pequeño', 'Moderado', 'Grande', 'Plan Marshall'],
    desc: 'Rebajas fiscales, servicios y vivienda para repoblar el interior.',
    fx: 'depopulation -0.2 sqrt, birthrate 0.02, rural 0.3, farmers 0.08' });
  pol({ id: 'monarchy', cat: 'territory', name: 'Presupuesto de la Casa Real', local: '', init: 0.5, intro: 30, budget: ['spend', 0.017, 'gdp'], lr: 0.15, cen: 0.2,
    levels: ['Austero', 'Ajustado', 'Normal', 'Generoso', 'Espléndido'],
    desc: 'Financiación y presencia de la Corona. Una partida simbólica con peso político real.',
    fx: 'patriots 0.12, catholics 0.05, secular -0.06, catalanNat -0.05, basqueNat -0.05' });

  // ── Environment & energy ─────────────────────────────────────
  pol({ id: 'renewableSubsidy', cat: 'environment', name: 'Plan de renovables', local: '', init: 0.55, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.1,
    levels: ['Ninguno', 'Bajo', 'Moderado', 'Alto', 'Máximo'],
    desc: 'Subastas, red eléctrica y almacenamiento para la solar y la eólica.',
    fx: 'renewables 0.3 sqrt, emissions -0.12, energy -0.06, investment 0.03, unemployment -0.02, environmentalists 0.25, rural 0.04' });
  pol({ id: 'nuclearPhaseout', cat: 'environment', name: 'Cierre nuclear', local: '', init: 0.6, intro: 30, budget: ['spend', 1.2, 'gdp'], lr: -0.15,
    levels: ['Alargar las centrales', 'Lento', 'Planificado', 'Acelerado', 'Inmediato'],
    desc: 'Calendario de cierre de los reactores nucleares.',
    fx: 'energy 0.08, emissions 0.06, growth -0.02, investment -0.04, environmentalists 0.15' });
  pol({ id: 'waterInfra', cat: 'environment', name: 'Infraestructuras del agua', local: '', init: 0.4, intro: 25, budget: ['spend', 5, 'gdp'],
    levels: ['Mínimas', 'Básicas', 'Moderadas', 'Grandes', 'Masivas'],
    desc: 'Desaladoras, conducciones y trasvases entre cuencas.',
    fx: 'water -0.25 sqrt, energy 0.02, tourism 0.02, farmers 0.2, environmentalists -0.04' });
  pol({ id: 'irrigationLimits', cat: 'environment', name: 'Límites al regadío', local: '', init: null, intro: 30, budget: ['spend', 1.2, 'gdp'], lr: -0.1,
    levels: ['Recomendación', 'Ligeros', 'Moderados', 'Estrictos', 'Severos'],
    desc: 'Limitar el agua del regadío, el mayor consumidor de agua, para proteger acuíferos y humedales.',
    fx: 'water -0.2, growth -0.02, farmers -0.4, rural -0.15, environmentalists 0.25' });
  pol({ id: 'evSubsidy', availableFrom: 2010, cat: 'environment', name: 'Ayudas al coche eléctrico', local: '', init: 0.3, intro: 15, budget: ['spend', 5, 'gdp'],
    levels: ['Ninguna', 'Bajas', 'Moderadas', 'Altas', 'Muy altas'],
    desc: 'Ayudas para comprar coches eléctricos e instalar puntos de recarga.',
    fx: 'emissions -0.05, productivity 0.02, everyone 0.024, wealthy 0.05, environmentalists 0.1' });
  pol({ id: 'lowEmissionZones', cat: 'environment', name: 'Zonas de bajas emisiones', local: '', init: 0.4, intro: 20, budget: ['spend', 0.5, 'gdp'], lr: -0.2,
    levels: ['Ninguna', 'Simbólicas', 'Moderadas', 'Estrictas', 'Centros sin coches'],
    desc: 'Prohibir la entrada de los coches más contaminantes en los centros urbanos.',
    fx: 'emissions -0.06, health 0.03, everyone -0.075, selfEmployed -0.08, rural -0.03, environmentalists 0.2' });
  pol({ id: 'wildfirePrevention', cat: 'environment', name: 'Prevención de incendios', local: '', init: 0.35, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['Mínima', 'Básica', 'Moderada', 'Fuerte', 'Integral'],
    desc: 'Bomberos forestales todo el año, limpieza del monte y gestión del territorio.',
    fx: 'emissions -0.03, water -0.02, depopulation -0.02, rural 0.12, environmentalists 0.1' });
  pol({ id: 'tolls', cat: 'environment', name: 'Peajes en autovías', local: '', init: null, intro: 30, budget: ['rev', 8, 'gdp'], lr: -0.05,
    levels: ['Solo camiones', 'Bajos', 'Moderados', 'Altos', 'Muy altos'],
    desc: 'Cobrar por circular por las autovías.',
    fx: 'emissions -0.03, infrastructure 0.08, everyone -0.105, rural -0.08, environmentalists 0.05' });

  // ── Housing & society ────────────────────────────────────────
  pol({ id: 'publicHousing', cat: 'society', name: 'Vivienda pública', local: '', init: 0.3, intro: 25, budget: ['spend', 12, 'gdp'], lr: -0.2,
    levels: ['Mínima', 'Pequeña', 'Moderada', 'Grande', 'Modelo Viena'],
    desc: 'Parque público de vivienda social en alquiler.',
    fx: 'housing -0.15 sqrt, inequality -0.03, unemployment -0.02, birthrate 0.02, tenants 0.25, youth 0.2, wealthy -0.06' });
  pol({ id: 'rentControl', cat: 'society', name: 'Control del alquiler', local: '', init: 0.35, intro: 30, lr: -0.4,
    levels: ['Ninguno', 'Ligero', 'Zonas tensionadas', 'Estricto', 'Congelación'],
    desc: 'Topes a la subida de los alquileres.',
    fx: 'housing -0.12, investment -0.05, tenants 0.35, youth 0.1, wealthy -0.32' });
  pol({ id: 'touristFlats', cat: 'society', name: 'Límites a los pisos turísticos', local: '', init: 0.35, intro: 25, budget: ['spend', 0.05, 'gdp'], lr: -0.2,
    levels: ['Sin regular', 'Registro', 'Licencias', 'Topes estrictos', 'Prohibición'],
    desc: 'Limitar los alquileres vacacionales que expulsan a los vecinos de los centros urbanos.',
    fx: 'housing -0.1, tourism -0.04, tenants 0.2, youth 0.06, wealthy -0.15, tourismWorkers -0.06' });
  pol({ id: 'goldenVisa', cat: 'society', name: 'Visado de oro', local: '', init: null, intro: 20, lr: 0.3,
    levels: ['Desde 1 M€', 'Desde 750.000 €', 'Desde 500.000 €', 'Desde 350.000 €', 'Desde 250.000 €'],
    desc: 'Residencia para extranjeros que compran vivienda de alto valor.',
    fx: 'housing 0.06, investment 0.06, corruption 0.03, wealthy 0.1, tenants -0.15' });
  pol({ id: 'firstHome', cat: 'society', name: 'Avales para la primera vivienda', local: '', init: 0.3, intro: 15, budget: ['spend', 3, 'gdp'],
    levels: ['Ninguno', 'Pequeños', 'Moderados', 'Grandes', 'Universales'],
    desc: 'Avales públicos para que los jóvenes compren con poca entrada.',
    fx: 'housing 0.03, birthrate 0.02, youth 0.12, parents 0.06, wealthy 0.024' });
  pol({ id: 'genderEquality', cat: 'society', name: 'Igualdad y violencia de género', local: '', init: 0.6, intro: 20, budget: ['spend', 2, 'gdp'], lr: -0.25,
    levels: ['Mínima', 'Básica', 'Fuerte', 'Muy fuerte', 'Máxima'],
    desc: 'Juzgados de violencia de género, cuotas y control de la igualdad salarial.',
    fx: 'gender 0.25 sqrt, crime -0.02, feminists 0.4, catholics -0.08, patriots -0.1' });
  pol({ id: 'churchFunding', cat: 'society', name: 'Financiación de la Iglesia', local: '', init: 0.5, intro: 25, budget: ['spend', 0.7, 'gdp'], lr: 0.3,
    levels: ['Ninguna', 'Reducida', 'Casilla del IRPF', 'Aumentada', 'Generosa'],
    desc: 'Los contribuyentes pueden destinar una parte de su IRPF a la Iglesia católica.',
    fx: 'catholics 0.35, secular -0.25' });
  pol({ id: 'bullfighting', cat: 'society', name: 'Protección de la tauromaquia', local: '', init: 0.5, intro: 20, budget: ['spend', 0.1, 'gdp'], lr: 0.3, cen: 0.2,
    levels: ['Prohibida', 'Restringida', 'Tolerada', 'Patrimonio protegido', 'Subvencionada'],
    desc: 'Para unos, patrimonio cultural; para otros, maltrato animal.',
    fx: 'tourism 0.01, bullfighting 0.5, rural 0.04, patriots 0.1, environmentalists -0.2, catalanNat -0.05' });
  pol({ id: 'animalWelfare', cat: 'society', name: 'Ley de Bienestar Animal', local: '', init: 0.5, intro: 20, budget: ['spend', 0.15, 'gdp'], lr: -0.2,
    levels: ['Débil', 'Básica', 'Normal', 'Fuerte', 'Muy fuerte'],
    desc: 'Normas sobre animales de compañía, cría y perros de caza.',
    fx: 'environmentalists 0.25, farmers -0.15, bullfighting -0.15, rural -0.08' });
  pol({ id: 'euthanasia', cat: 'society', name: 'Ley de Eutanasia', local: '', init: 0.5, intro: 25, budget: ['spend', 0.05, 'gdp'], lr: -0.25,
    levels: ['Derogada', 'Muy restrictiva', 'Normal', 'Más amplia', 'Liberal'],
    desc: 'Muerte digna y asistida.',
    fx: 'liberty 0.05, catholics -0.25, secular 0.2, pensioners -0.02' });
  pol({ id: 'memoryLaw', cat: 'society', name: 'Memoria democrática', local: '', init: 0.5, intro: 20, budget: ['spend', 0.06, 'gdp'], lr: -0.3,
    levels: ['Derogada', 'Mínima', 'Normal', 'Ampliada', 'Comisión de la verdad'],
    desc: 'Exhumación de víctimas de la Guerra Civil y el franquismo, y retirada de símbolos franquistas.',
    fx: 'secular 0.1, catalanNat 0.04, basqueNat 0.04, patriots -0.2, catholics -0.06' });

  // ── Added policies ───────────────────────────────────────────
  pol({ id: 'emptyHomesTax', cat: 'tax', name: 'Impuesto a viviendas vacías', local: '', init: null, intro: 25, budget: ['rev', 2, 'gdp'], lr: -0.25,
    levels: ['Simbólico', 'Ligero', 'Moderado', 'Fuerte', 'Confiscatorio'],
    desc: 'Gravar las viviendas vacías para que sus dueños las alquilen o las vendan.',
    fx: 'housing -0.05, tenants 0.1, youth 0.03, wealthy -0.12' });
  pol({ id: 'foreignBuyers', cat: 'society', name: 'Impuesto a compradores extranjeros', local: '', init: null, intro: 25, budget: ['rev', 1.5, 'gdp'], lr: -0.1, cen: 0.05,
    levels: ['10 %', '25 %', '50 %', '75 %', '100 %'],
    desc: 'Recargo sobre las viviendas que compran no residentes de fuera de la UE.',
    fx: 'housing -0.05, investment -0.03, tenants 0.1, wealthy -0.06, tourismWorkers -0.03' });
  pol({ id: 'landReform', cat: 'society', name: 'Ley del Suelo', local: '', init: 0.4, intro: 30, lr: 0.15,
    levels: ['Muy restrictiva', 'Restrictiva', 'Equilibrada', 'Permisiva', 'Construir en cualquier sitio'],
    desc: 'Facilidad para recalificar suelo y construir. Más oferta abarata la vivienda con el tiempo, a costa del paisaje y con riesgo de corrupción.',
    fx: 'housing -0.14, investment 0.04, unemployment -0.02, corruption 0.04, emissions 0.02, environmentalists -0.12, wealthy 0.05, tenants 0.05' });
  pol({ id: 'aiStrategy', availableFrom: 2023, cat: 'economy', name: 'Estrategia de inteligencia artificial', local: '', init: 0.3, intro: 20, budget: ['spend', 4, 'gdp'],
    levels: ['Ninguna', 'Básica', 'Moderada', 'Ambiciosa', 'Líder mundial'],
    desc: 'Supercomputación pública, investigación en IA y formación digital.',
    fx: 'productivity 0.1 sqrt, investment 0.04, unemployment 0.01, youth 0.05, workers -0.03' });
  pol({ id: 'retraining', cat: 'economy', name: 'Formación para el empleo', local: '', init: 0.4, intro: 20, budget: ['spend', 8, 'gdp'], lr: -0.05,
    levels: ['Mínima', 'Básica', 'Moderada', 'Amplia', 'Universal'],
    desc: 'FP dual y reciclaje para parados y trabajadores desplazados por la automatización.',
    fx: 'unemployment -0.06, precarity -0.04, productivity 0.04, unemployed 0.15, workers 0.05, youth 0.06' });
  pol({ id: 'freeTrade', cat: 'economy', name: 'Acuerdos de libre comercio', local: '', init: 0.5, intro: 25, lr: 0.15,
    levels: ['Proteccionista', 'Cautelosa', 'Favorable', 'Abanderada', 'Incondicional'],
    desc: 'Postura ante los tratados comerciales de la UE: buenos para exportadores y consumidores, temidos por el campo.',
    fx: 'growth 0.04, investment 0.04, inflation -0.02, farmers -0.25, rural -0.05, selfEmployed 0.04, workers -0.02' });
  pol({ id: 'childcare', cat: 'welfare', name: 'Escuelas infantiles gratuitas', local: '', init: 0.3, intro: 20, budget: ['spend', 8, 'gdp'], lr: -0.1,
    levels: ['Mínimas', 'Escasas', 'Moderadas', 'Amplias', 'Universales'],
    desc: 'Plazas gratuitas de 0 a 3 años para que madres y padres puedan seguir trabajando.',
    fx: 'birthrate 0.07, gender 0.06, unemployment -0.02, education 0.02, parents 0.25, feminists 0.06' });
  pol({ id: 'energyBonus', cat: 'welfare', name: 'Bono social eléctrico', local: '', init: 0.4, intro: 15, budget: ['spend', 6, 'gdp'], lr: -0.1,
    levels: ['Ninguno', 'Focalizado', 'Moderado', 'Amplio', 'Universal'],
    desc: 'Descuentos en la factura de la luz para los hogares vulnerables.',
    fx: 'poverty -0.04, inflation -0.02, emissions 0.02, lowIncome 0.12, everyone 0.03, environmentalists -0.03' });
  pol({ id: 'dentalCare', cat: 'services', name: 'Dentista público', local: '', init: null, intro: 25, budget: ['spend', 4, 'gdp'], lr: -0.15,
    levels: ['Solo niños', 'Básico', 'Moderado', 'Amplio', 'Cobertura total'],
    desc: 'Incluir la odontología en la sanidad pública.',
    fx: 'health 0.04, lowIncome 0.12, pensioners 0.08, everyone 0.02' });
  pol({ id: 'remoteWork', availableFrom: 2020, cat: 'territory', name: 'Teletrabajo rural', local: '', init: null, intro: 15, budget: ['spend', 1.5, 'gdp'],
    levels: ['Piloto', 'Pequeño', 'Moderado', 'Grande', 'Nacional'],
    desc: 'Ayudas y rebajas fiscales a quien se mude a un pueblo para teletrabajar.',
    fx: 'depopulation -0.06, productivity 0.01, rural 0.1, youth 0.03' });
  pol({ id: 'selfDetermination', cat: 'territory', name: 'Referéndum pactado', local: '', init: null, intro: 60, budget: ['spend', 0.3, 'gdp'], lr: -0.1, cen: -0.9,
    levels: ['Consultivo', 'Consultivo reforzado', 'Vinculante con mayoría cualificada', 'Vinculante', 'Vinculante por mayoría simple'],
    desc: 'Una votación legal y acordada sobre la independencia de Cataluña. Rebaja la tensión, pero indigna a buena parte de España.',
    fx: 'tension -0.35, investment -0.05, catalanNat 0.6, basqueNat 0.15, patriots -0.6, everyone -0.04, catholics -0.05' });
  pol({ id: 'greenHydrogen', availableFrom: 2020, cat: 'environment', name: 'Hidrógeno verde y almacenamiento', local: '', init: 0.2, intro: 25, budget: ['spend', 6, 'gdp'],
    levels: ['Pilotos', 'Pequeño', 'Moderado', 'Grande', 'Masivo'],
    desc: 'Baterías, bombeo e hidrógeno para guardar la energía solar y estabilizar la red.',
    fx: 'renewables 0.08, energy -0.05, investment 0.05, emissions -0.04, unemployment -0.01, environmentalists 0.08' });

  S.policies = P;

  S.policyCats = {
    tax: { name: 'Fiscalidad', local: '', icon: '€' },
    economy: { name: 'Economía y empleo', local: '', icon: '⚙' },
    welfare: { name: 'Bienestar', local: '', icon: '♥' },
    services: { name: 'Servicios públicos', local: '', icon: '✚' },
    law: { name: 'Interior y defensa', local: '', icon: '⚖' },
    territory: { name: 'Modelo territorial', local: '', icon: '◈' },
    environment: { name: 'Medio ambiente y energía', local: '', icon: '☀' },
    society: { name: 'Vivienda y sociedad', local: '', icon: '⌂' },
  };

  /* ---------------------------------------------------------------
   * SITUATIONS: persistent states with hysteresis
   * ------------------------------------------------------------- */
  S.situations = [
    { id: 'housingCrisis', name: 'Emergencia habitacional', local: '', bad: true,
      trigger: (s) => s.housing, on: 0.66, off: 0.58,
      desc: 'Los jóvenes no pueden independizarse: los alquileres se comen sus sueldos.',
      fx: 'tenants -0.15, youth -0.12, everyone -0.04, birthrate -0.04' },
    { id: 'drought', name: 'Sequía extrema', local: '', bad: true,
      trigger: (s) => s.water, on: 0.68, off: 0.55,
      desc: 'Embalses en mínimos y restricciones de agua.',
      fx: 'farmers -0.25, rural -0.1, growth -0.03, energy 0.04, tourism -0.02' },
    { id: 'recession', name: 'Recesión', local: '', bad: true,
      trigger: (s) => s.growth, on: 0.3, off: 0.38, below: true,
      desc: 'La economía se contrae.',
      fx: 'unemployment 0.06, investment -0.06, poverty 0.04, everyone -0.08' },
    { id: 'boom', name: 'Bonanza', local: '', bad: false,
      trigger: (s) => s.growth, on: 0.75, off: 0.66,
      desc: 'La economía crece con fuerza. Cuidado con el recalentamiento y con una burbuja inmobiliaria.',
      fx: 'unemployment -0.02, inflation 0.04, housing 0.03, everyone 0.04' },
    { id: 'massUnemployment', name: 'Generación perdida', local: '', bad: true,
      trigger: (s) => s.unemployment, on: 0.5, off: 0.42,
      desc: 'Paro masivo. Los jóvenes titulados emigran en busca de trabajo.',
      fx: 'youth -0.2, crime 0.04, birthrate -0.03, immigration -0.04, productivity -0.02' },
    { id: 'fullEmployment', name: 'Pleno empleo', local: '', bad: false,
      trigger: (s) => s.unemployment, on: 0.2, off: 0.25, below: true,
      desc: 'El paro está en mínimos. Suben los salarios y la confianza de los trabajadores.',
      fx: 'workers 0.1, everyone 0.05, inflation 0.03, immigration 0.05' },
    { id: 'independenceCrisis', name: 'Crisis independentista', local: '', bad: true,
      trigger: (s) => s.tension, on: 0.72, off: 0.55,
      desc: 'Manifestaciones masivas y desafío abierto del gobierno autonómico.',
      fx: 'investment -0.1, growth -0.03, tourism -0.02, patriots -0.2, catalanNat 0.1' },
    { id: 'debtCrisis', name: 'Crisis de deuda', local: '', bad: true,
      trigger: (s) => s.riskPremium, on: 0.5, off: 0.33,
      desc: 'La prima de riesgo se dispara. Los mercados dudan de que España pueda pagar.',
      fx: 'growth -0.1, investment -0.2, unemployment 0.06, everyone -0.15, wealthy -0.1, pensioners -0.08', capital: -3 },
    { id: 'excessiveDeficit', name: 'Déficit excesivo', local: '', bad: true,
      trigger: (s) => s.deficitRatio, on: 0.38, off: 0.3,
      desc: 'Bruselas abre un procedimiento por déficit excesivo.',
      fx: 'investment -0.04, riskPremium 0.05', capital: -1 },
    { id: 'overtourism', name: 'Turismofobia', local: '', bad: true,
      trigger: (s) => s.tourism, on: 0.82, off: 0.74,
      desc: 'Los vecinos protestan contra la masificación turística.',
      fx: 'housing 0.04, water 0.03, tenants -0.08, environmentalists -0.1' },
    { id: 'energyCrisis', name: 'Crisis energética', local: '', bad: true,
      trigger: (s) => s.energy, on: 0.7, off: 0.58,
      desc: 'La factura de la luz se ha disparado.',
      fx: 'inflation 0.05, growth -0.03, lowIncome -0.1, everyone -0.05' },
    { id: 'crimeWave', name: 'Ola de inseguridad', local: '', bad: true,
      trigger: (s) => s.crime, on: 0.52, off: 0.42,
      desc: 'Los robos y la violencia de bandas copan los informativos.',
      fx: 'tourism -0.03, everyone -0.05, pensioners -0.08, patriots -0.06' },
    { id: 'demographicWinter', name: 'Invierno demográfico', local: '', bad: true,
      trigger: (s) => s.birthrate, on: 0.18, off: 0.26, below: true,
      desc: 'Nacimientos en mínimos; cierran escuelas en el interior.',
      fx: 'depopulation 0.04, growth -0.02, catholics -0.05, parents -0.03' },
    { id: 'innovationHub', name: 'Polo tecnológico', local: '', bad: false,
      trigger: (s) => s.productivity, on: 0.62, off: 0.54,
      desc: 'Las grandes ciudades atraen empresas emergentes y talento.',
      fx: 'investment 0.05, growth 0.03, youth 0.08' },
    { id: 'corruptionCulture', name: 'Corrupción sistémica', local: '', bad: true,
      trigger: (s) => s.corruption, on: 0.65, off: 0.52,
      desc: 'Las mordidas en los contratos públicos son un escándalo nacional.',
      fx: 'investment -0.05, everyone -0.08' },
  ];

  /* ---------------------------------------------------------------
   * EVENTS & DILEMMAS
   *   chance(state) -> probability this quarter
   *   fx      : temporary effects "target amount", fade over `turns`
   *   choices : make it a dilemma; each choice has fx / policy / cost / capital
   * ------------------------------------------------------------- */
  S.events = [
    { id: 'wildfires', title: 'Ola de calor e incendios', local: '',
      chance: (st) => (st.quarter === 3 ? 0.18 : 0.02) * (0.4 + st.sims.water + (st.sims.climate - 0.5)) * (1.25 - 0.8 * st.pol('wildfirePrevention')),
      why: (st) => [st.pol('wildfirePrevention') < 0.4 && 'Poca inversión en prevención de incendios', st.sims.water > 0.6 && 'La sequía ha secado el monte', st.quarter === 3 && 'Es verano'],
      text: 'Temperaturas de más de 45 °C. Arden decenas de miles de hectáreas en el oeste peninsular.',
      fx: 'rural -0.15, environmentalists -0.1, everyone -0.03, emissions 0.03, tourism -0.02', turns: 4 },
    { id: 'dana', title: 'Inundaciones por una DANA', local: '',
      chance: (st) => (st.quarter === 4 ? 0.07 : 0.01) * (0.6 + st.sims.climate),
      text: 'Una gota fría descarga en horas la lluvia de un año en la costa mediterránea. Hay pueblos arrasados y enfado por la lentitud de la respuesta.',
      choices: [
        { label: 'Gran plan de ayudas del Estado', desc: 'Reconstrucción de 10.000 millones y despliegue del ejército.', cost: 10, fx: 'everyone 0.05, infrastructure -0.02', turns: 6 },
        { label: 'Que lidere el gobierno autonómico', desc: 'Respetar las competencias y ofrecer apoyo si lo piden.', fx: 'everyone -0.1, infrastructure -0.05, tension 0.02', turns: 6 },
      ] },
    { id: 'generalStrike', title: 'Huelga general', local: '',
      chance: (st) => (st.groupHappy.workers < 0.35 ? 0.2 : 0) + (st.pol('labourProtection') < 0.35 ? 0.08 : 0) + (st.pol('retirementAge') > 0.8 ? 0.05 : 0),
      why: (st) => [st.groupHappy.workers < 0.35 && 'Los trabajadores están enfadados con tu gobierno', st.pol('labourProtection') < 0.35 && 'Has rebajado la protección laboral', st.pol('retirementAge') > 0.8 && 'Has subido mucho la edad de jubilación'],
      text: 'Los grandes sindicatos paralizan el país contra tu política laboral.',
      fx: 'growth -0.03, workers -0.05', turns: 2, capital: -6 },
    { id: 'scandal', title: 'Escándalo de corrupción en tu partido', local: '',
      chance: (st) => (0.015 + st.sims.corruption * 0.06) * (1.3 - 0.8 * st.pol('antiCorruption')),
      why: (st) => [st.sims.corruption > 0.5 && 'La corrupción está extendida', st.pol('antiCorruption') < 0.35 && 'La Oficina Anticorrupción es débil'],
      text: 'La policía registra la casa de un ministro. Unas grabaciones apuntan a comisiones en contratos públicos.',
      choices: [
        { label: 'Forzar la dimisión del ministro', desc: 'Doloroso, pero demuestra tolerancia cero.', capital: -10, fx: 'corruption -0.02, everyone -0.03', turns: 4 },
        { label: 'Defender su inocencia', desc: 'Mantener el Gobierno intacto y denunciar una persecución.', fx: 'corruption 0.04, everyone -0.12', turns: 8 },
      ] },
    { id: 'cayucos', title: 'Llegada masiva de cayucos a Canarias', local: '',
      chance: (st) => (0.02 + st.sims.migrationPressure * 0.08) * (1.6 - 1.2 * st.pol('borderControl')),
      why: (st) => [st.pol('borderControl') < 0.4 && 'El presupuesto de control fronterizo es bajo', st.sims.migrationPressure > 0.58 && 'La presión migratoria es alta'],
      text: 'Miles de personas llegan por la ruta atlántica en una sola semana. Los centros de acogida están desbordados.',
      choices: [
        { label: 'Repartir a los menores entre comunidades', desc: 'Reparto solidario; algunas comunidades se oponen.', cost: 1.2, fx: 'immigrants 0.1, patriots -0.15, tension 0.01', turns: 6 },
        { label: 'Negociar devoluciones con la UE', desc: 'Más patrullas con los países de origen y de tránsito.', fx: 'immigrants -0.15, patriots 0.1, liberty -0.02, immigration -0.03', turns: 6 },
      ] },
    { id: 'recordTourism', title: 'Temporada turística récord', local: '',
      chance: (st) => (st.quarter === 3 ? 0.25 * st.sims.tourism : 0),
      text: 'Récord de visitantes extranjeros. Hoteles llenos; los vecinos se quejan de las aglomeraciones.',
      fx: 'growth 0.02, tourismWorkers 0.1, tenants -0.05', turns: 3 },
    { id: 'tractors', title: 'Tractoradas', local: '',
      chance: (st) => (st.groupHappy.farmers < 0.35 ? 0.18 : 0.02),
      text: 'Los agricultores cortan autovías y el centro de Madrid contra las normas europeas, los precios bajos y la sequía.',
      choices: [
        { label: 'Ceder: menos trámites y ayudas urgentes', desc: 'Ayudas de 1.500 millones y normas ambientales más laxas.', cost: 1.5, fx: 'farmers 0.2, environmentalists -0.1', turns: 6 },
        { label: 'Mantenerse firme', desc: 'Diálogo, pero sin dinero nuevo.', fx: 'farmers -0.12, everyone -0.015, environmentalists 0.05', turns: 4 },
      ] },
    { id: 'blackout', title: 'Gran apagón', local: '',
      chance: (st) => (0.01 + Math.max(0, st.sims.renewables - 0.6) * 0.1 + Math.max(0, st.pol('nuclearPhaseout') - 0.6) * 0.03) * (1.3 - st.pol('greenHydrogen')),
      why: (st) => [st.sims.renewables > 0.62 && 'Una red dominada por la solar y la eólica tiene poca inercia', st.pol('greenHydrogen') < 0.3 && 'Poca inversión en almacenamiento', st.pol('nuclearPhaseout') > 0.7 && 'Las nucleares cierran deprisa'],
      text: 'Toda la península se queda sin luz durante horas. Se paran los trenes, caen los móviles y la gente hace cola para comprar radios.',
      choices: [
        { label: 'Alargar la vida de las nucleares', desc: 'Retrasar el cierre nuclear para dar estabilidad a la red.', policy: ['nuclearPhaseout', -0.25], fx: 'environmentalists -0.12, investment 0.02', turns: 6 },
        { label: 'Invertir 4.000 millones en almacenamiento', desc: 'Baterías, bombeo e interconexiones.', cost: 4, fx: 'renewables 0.02, energy -0.02, environmentalists 0.05', turns: 8 },
      ] },
    { id: 'referendum', title: 'Anuncio de un referéndum unilateral', local: '',
      chance: (st) => (st.sims.tension > 0.62 ? 0.12 : 0) + (st.pol('recentralisation') > 0.3 ? 0.05 : 0),
      why: (st) => [st.sims.tension > 0.62 && 'La tensión territorial es muy alta', st.pol('recentralisation') > 0.3 && 'La intervención del Estado provoca a las instituciones catalanas'],
      text: 'El Govern convoca un referéndum de independencia sin el acuerdo del Estado.',
      choices: [
        { label: 'Aplicar el artículo 155', desc: 'Intervenir la Generalitat y parar la votación.', policy: ['recentralisation', 0.5], fx: 'patriots 0.25, catalanNat -0.35, tension 0.08, liberty -0.05', turns: 8 },
        { label: 'Ofrecer un acuerdo', desc: 'Un nuevo estatuto a cambio de desconvocarlo.', policy: ['dialogue', 0.2], fx: 'catalanNat 0.2, patriots -0.25, tension -0.08', turns: 8 },
      ] },
    { id: 'euFunds', title: 'Llega un tramo de fondos europeos', local: '',
      chance: (st) => (st.year >= 2021 && st.year <= 2029 ? 0.12 : 0),
      text: 'Bruselas libera otro tramo de los fondos de recuperación.',
      fx: 'growth 0.02, investment 0.03', turns: 4, revenue: 10 },
    { id: 'royalScandal', title: 'Escándalo en la Casa Real', local: '',
      chance: () => 0.012,
      text: 'Se publican cuentas opacas en el extranjero vinculadas a un miembro de la familia real.',
      fx: 'patriots -0.06, secular 0.04, catalanNat 0.03, everyone -0.02', turns: 4 },
    { id: 'housingProtest', title: 'Protestas masivas por la vivienda', local: '',
      chance: (st) => (st.situations.housingCrisis ? 0.12 : 0) + (st.situations.housingCrisis && st.pol('publicHousing') < 0.3 ? 0.06 : 0),
      why: (st) => [st.situations.housingCrisis && 'La emergencia habitacional', st.pol('publicHousing') < 0.3 && 'Apenas se construye vivienda pública'],
      text: 'Cientos de miles de personas marchan en las grandes ciudades para exigir alquileres asequibles.',
      fx: 'tenants -0.1, youth -0.08', turns: 3, capital: -3 },
    { id: 'football', title: '¡España, campeona!', local: '',
      chance: (st) => (st.quarter === 3 && st.year % 2 === 0 ? 0.25 : 0),
      text: 'La selección levanta el trofeo. Celebraciones de Cádiz a Girona.',
      fx: 'everyone 0.06, patriots 0.06', turns: 3 },
    { id: 'oilShock', title: 'Crisis del petróleo', local: '',
      chance: () => 0.025,
      text: 'Un conflicto en Oriente Próximo dispara el petróleo y el gas.',
      fx: 'energy 0.12, inflation 0.05, growth -0.03', turns: 6 },
    { id: 'ecbHike', title: 'El BCE sube los tipos', local: '',
      chance: (st) => (st.sims.inflation > 0.4 ? 0.12 : 0.02),
      text: 'Fráncfort endurece su política para frenar la inflación. Suben las hipotecas variables.',
      fx: 'growth -0.03, inflation -0.03, riskPremium 0.03, everyone -0.03', turns: 6 },
    { id: 'whiteTide', title: 'Huelga de médicos y profesores', local: '',
      chance: (st) => (st.groupHappy.publicSector < 0.4 ? 0.15 : 0.01) + (st.pol('healthcare') < 0.45 ? 0.06 : 0) + (st.pol('education') < 0.4 ? 0.05 : 0),
      why: (st) => [st.groupHappy.publicSector < 0.4 && 'Los funcionarios están descontentos', st.pol('healthcare') < 0.45 && 'La sanidad está infrafinanciada', st.pol('education') < 0.4 && 'La educación está infrafinanciada'],
      text: 'Médicos y docentes paran por los salarios y la carga de trabajo. Crecen las listas de espera.',
      fx: 'health -0.03, education -0.01, publicSector -0.05', turns: 3, capital: -3 },
    { id: 'techHub', title: 'Una gran tecnológica elige España', local: '',
      chance: (st) => st.sims.productivity * 0.06,
      text: 'Una multinacional tecnológica instala en España su sede europea y un centro de datos.',
      fx: 'investment 0.05, growth 0.01, youth 0.04', turns: 6 },
    { id: 'bailout', title: 'Los mercados cierran el grifo', local: '',
      chance: (st) => (st.situations.debtCrisis ? 0.35 : 0),
      text: 'Las subastas de deuda fracasan. El Eurogrupo ofrece un rescate con duras condiciones: recortar pensiones y plantilla pública y subir el IVA.',
      choices: [
        { label: 'Aceptar el rescate europeo', desc: 'Recortes y subida del IVA. Los mercados se calman; los votantes, no.', policies: [['pensions', -0.2], ['civilService', -0.15], ['vat', 0.15]], fx: 'riskPremium -0.25, everyone -0.08, patriots -0.08, pensioners -0.1', turns: 8, capital: -10 },
        { label: 'Rechazarlo y resistir solos', desc: 'Defender la soberanía y esperar a que pase la tormenta.', fx: 'riskPremium 0.12, growth -0.06, investment -0.12, patriots 0.06', turns: 8 },
      ] },
    { id: 'pensionReform', title: 'Bruselas exige reformar las pensiones', local: '',
      chance: (st) => (st.sims.deficitRatio > 0.32 ? 0.08 : 0),
      text: 'La Comisión Europea condiciona sus fondos a la sostenibilidad del sistema de pensiones.',
      choices: [
        { label: 'Subir la edad de jubilación', desc: 'Retrasar la jubilación alrededor de un año.', policy: ['retirementAge', 0.15], fx: 'riskPremium -0.04', turns: 6 },
        { label: 'Negarse: las pensiones no se tocan', desc: 'Defender a los pensionistas y plantar cara a Bruselas.', fx: 'pensioners 0.08, riskPremium 0.05, investment -0.03', turns: 8 },
      ] },
    { id: 'ceutaJump', title: 'Salto masivo en Ceuta', local: '',
      chance: (st) => (st.pol('borderControl') < 0.4 ? 0.12 : 0.01) * (0.5 + st.sims.migrationPressure),
      why: (st) => [st.pol('borderControl') < 0.4 && 'El presupuesto de control fronterizo es bajo', st.sims.migrationPressure > 0.58 && 'Fuerte presión migratoria'],
      text: 'Miles de personas rodean el espigón a nado y saltan la valla en una sola noche.',
      choices: [
        { label: 'Reforzar la frontera y devolver', desc: 'Enviar al ejército y devolver rápido a los adultos.', cost: 0.6, fx: 'patriots 0.12, immigrants -0.12, liberty -0.04', turns: 6 },
        { label: 'Acogida humanitaria', desc: 'Tramitar el asilo y proteger a los menores.', cost: 0.4, fx: 'patriots -0.15, immigrants 0.08, immigration 0.02', turns: 6 },
      ] },
    { id: 'narco', title: 'Los narcos desafían a la Guardia Civil', local: '',
      chance: (st) => Math.max(0, 0.55 - st.pol('police')) * 0.25 + (st.sims.crime > 0.45 ? 0.05 : 0),
      why: (st) => [st.pol('police') < 0.45 && 'Faltan policías y guardias civiles', st.sims.crime > 0.45 && 'La criminalidad es alta'],
      text: 'Una narcolancha embiste a una patrulla en el Estrecho. Mueren dos agentes y el país se indigna.',
      choices: [
        { label: 'Plan especial para el Estrecho', desc: 'Más agentes, embarcaciones y helicópteros.', cost: 0.8, policy: ['police', 0.08], fx: 'crime -0.03, patriots 0.06', turns: 6 },
        { label: 'Culpar a otras administraciones', desc: 'Prometer que se estudiará.', fx: 'everyone -0.04, patriots -0.1, publicSector -0.05', turns: 6 },
      ] },
    { id: 'waterCuts', title: 'Cortes de agua en las ciudades', local: '',
      chance: (st) => (st.sims.water > 0.6 ? 0.15 : 0) * (1.3 - st.pol('waterInfra')),
      why: (st) => [st.sims.water > 0.6 && 'Los embalses están en mínimos', st.pol('waterInfra') < 0.45 && 'Falta capacidad de desalación'],
      text: 'Los embalses caen a mínimos. Cierran piscinas, se secan los jardines y se habla de traer agua en barco.',
      choices: [
        { label: 'Desaladoras de emergencia y barcos', desc: 'Rápido, caro y con mucho consumo de energía.', cost: 1.5, policy: ['waterInfra', 0.1], fx: 'water -0.04, energy 0.01, everyone 0.02', turns: 6 },
        { label: 'Recortar antes el regadío', desc: 'Las personas, antes que los cultivos.', fx: 'farmers -0.2, rural -0.06, water -0.03', turns: 6 },
      ] },
    { id: 'erCollapse', title: 'Colapso de las urgencias', local: '',
      chance: (st) => (st.quarter === 1 ? 0.12 : 0.03) * Math.max(0, 1.3 - 1.5 * st.pol('healthcare')) + (st.sims.health < 0.45 ? 0.05 : 0),
      why: (st) => [st.pol('healthcare') < 0.55 && 'La sanidad está infrafinanciada', st.sims.health < 0.45 && 'Las listas de espera ya son largas', st.quarter === 1 && 'Temporada de gripe'],
      text: 'Pacientes que esperan días en camillas por los pasillos durante una ola de gripe.',
      fx: 'pensioners -0.1, parents -0.05, publicSector -0.06, health -0.03', turns: 3, capital: -2 },
    { id: 'pensionerMarch', title: 'Marea pensionista', local: '',
      chance: (st) => (st.pol('pensions') < 0.5 ? 0.3 : 0) + (st.sims.inflation > 0.45 && st.pol('pensions') < 0.65 ? 0.1 : 0),
      why: (st) => [st.pol('pensions') < 0.5 && 'Las pensiones suben menos que los precios', st.sims.inflation > 0.45 && 'Inflación alta'],
      text: 'Decenas de miles de jubilados exigen en Madrid que las pensiones suban con los precios.',
      fx: 'pensioners -0.08', turns: 3, capital: -4 },
    { id: 'capitalFlight', title: 'Fuga de patrimonios', local: '',
      chance: (st) => (st.pol('wealthTax') > 0.7 ? 0.15 : 0) + (st.pol('inheritanceTax') > 0.75 ? 0.08 : 0) + (st.pol('incomeTax') > 0.75 ? 0.06 : 0),
      why: (st) => [st.pol('wealthTax') > 0.7 && 'Un impuesto sobre el patrimonio muy alto', st.pol('inheritanceTax') > 0.75 && 'Un impuesto de sucesiones muy alto', st.pol('incomeTax') > 0.75 && 'Un IRPF muy alto'],
      text: 'Varios grandes patrimonios trasladan su residencia fiscal al extranjero. La patronal alerta de un éxodo.',
      fx: 'investment -0.05, wealthy -0.08, growth -0.01', turns: 6, revenue: -2 },
    { id: 'taxEvasion', title: 'Filtración de cuentas en paraísos fiscales', local: '',
      chance: (st) => Math.max(0, 0.55 - st.pol('taxFraud')) * 0.25,
      why: (st) => [st.pol('taxFraud') < 0.5 && 'Poca lucha contra el fraude fiscal'],
      text: 'Una filtración destapa a miles de españoles con dinero oculto en el extranjero, entre ellos empresarios y futbolistas.',
      choices: [
        { label: 'Contratar 2.000 inspectores', desc: 'Ir a por el dinero.', policy: ['taxFraud', 0.15], cost: 0.3, fx: 'workers 0.06, wealthy -0.08', turns: 6 },
        { label: 'Aprobar una amnistía fiscal', desc: 'Que lo repatríen con una pequeña multa. Dinero rápido, mala imagen.', revenue: 3, fx: 'corruption 0.04, everyone -0.06, workers -0.08', turns: 8 },
      ] },
    { id: 'heatDeath', title: 'Un verano mortal', local: '',
      chance: (st) => (st.quarter === 3 ? 0.08 * (0.5 + st.sims.climate) : 0),
      text: 'Miles de muertes tras semanas por encima de 40 °C. Los hospitales se desbordan.',
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
    AND: { name: 'Andalucía', local: '', cen: 0.3, lrBias: -0.03 },
    ARA: { name: 'Aragón', local: '', cen: 0.25 },
    AST: { name: 'Asturias', local: '', cen: 0.2, lrBias: -0.08 },
    BAL: { name: 'Islas Baleares', local: '', cen: 0.05 },
    CAN: { name: 'Canarias', local: '', cen: -0.05 },
    CNT: { name: 'Cantabria', local: '', cen: 0.3, lrBias: 0.05 },
    CLM: { name: 'Castilla-La Mancha', local: '', cen: 0.45, lrBias: 0.05 },
    CYL: { name: 'Castilla y León', local: '', cen: 0.45, lrBias: 0.1 },
    CAT: { name: 'Cataluña', local: '', cen: -0.45, lrBias: -0.1 },
    VAL: { name: 'Comunitat Valenciana', local: '', cen: 0.15, lrBias: 0.04 },
    EXT: { name: 'Extremadura', local: '', cen: 0.4 },
    GAL: { name: 'Galicia', local: '', cen: -0.05, lrBias: 0.05 },
    MAD: { name: 'Comunidad de Madrid', local: '', cen: 0.5, lrBias: 0.1 },
    MUR: { name: 'Región de Murcia', local: '', cen: 0.45, lrBias: 0.15 },
    NAV: { name: 'Navarra', local: '', cen: -0.2 },
    PV: { name: 'País Vasco', local: '', cen: -0.45, lrBias: -0.08 },
    RIO: { name: 'La Rioja', local: '', cen: 0.35, lrBias: 0.08 },
    CEU: { name: 'Ceuta', local: '', cen: 0.6, lrBias: 0.15 },
    MEL: { name: 'Melilla', local: '', cen: 0.6, lrBias: 0.15 },
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
    { id: 'reality', name: 'España hoy', local: '', year: 2027, difficulty: 'Normal',
      desc: 'Un gobierno de centroizquierda en minoría, emergencia habitacional, turismo récord, deuda por encima del 100 % y un Congreso fragmentado.',
      apply() {} },
    { id: 'majority', name: 'Mayoría absoluta', local: '', year: 2027, difficulty: 'Fácil',
      desc: 'La misma España, pero con mayoría absoluta. Sin socios a los que contentar y sin nadie a quien culpar.',
      apply(X) { setTargets(X, { player: 0.44, UC: 0.26, VP: 0.1, IP: 0.09, CC: 0.01 }); shiftMood(X, 0.03); } },
    { id: 'boom2006', name: 'La burbuja', local: '', year: 2006, difficulty: 'Engañosamente fácil',
      desc: 'Grúas por todas partes, crecimiento fuerte, superávit e inmigración récord. La vivienda está disparada y se acerca la crisis financiera mundial.',
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
    { id: 'crisis2012', name: 'La Gran Recesión', local: '', year: 2012, difficulty: 'Muy difícil',
      desc: 'Un gobierno de centroderecha con mayoría absoluta hereda un paro altísimo, un déficit enorme, una crisis bancaria y la prima de riesgo disparada.',
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
    { id: 'proces2017', name: 'El procés', local: '', year: 2017, difficulty: 'Difícil',
      desc: 'Un gobierno de centroderecha en minoría. La Generalitat prepara un referéndum ilegal, el paro sigue alto y cuatro partidos se reparten el voto.',
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
    { id: 'random', name: 'España aleatoria', local: '', year: 2027, difficulty: 'Desconocida',
      desc: 'Un país generado al azar: la economía, las cuentas, el ánimo de los votantes, el Parlamento e incluso tu ideología.',
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
      { id: 'left', name: 'Izquierda', lr: -0.65, party: { name: 'Alternativa Social', short: 'AS', color: '#b0233a' }, desc: 'Cambio económico profundo: impuestos a la riqueza, empresas públicas y sindicatos fuertes.' },
      { id: 'centreLeft', name: 'Centroizquierda', lr: -0.3, party: { name: 'Movimiento Progresista', short: 'MP', color: '#d7263d' }, desc: 'Socialdemocracia: Estado del bienestar, derechos laborales y reformas graduales.' },
      { id: 'centre', name: 'Centro', lr: 0, party: { name: 'Partido del Centro', short: 'PDC', color: '#e89f00' }, desc: 'Pragmatismo liberal: prudencia fiscal con conciencia social.' },
      { id: 'centreRight', name: 'Centroderecha', lr: 0.4, party: { name: 'Alianza Liberal', short: 'AL', color: '#1f5ea8' }, desc: 'Liberal-conservador: menos impuestos, apoyo a la empresa y valores tradicionales.' },
      { id: 'right', name: 'Derecha', lr: 0.72, party: { name: 'Nación y Libertad', short: 'NyL', color: '#2a4d8f' }, desc: 'Conservadurismo nacional: mano dura con la delincuencia y la inmigración e impuestos bajos.' },
    ],
    cen: [
      { id: 'devolution', name: 'Autonomista', cen: -0.45, desc: 'Más poder y dinero para las comunidades; diálogo con Cataluña.' },
      { id: 'balanced', name: 'Equilibrado', cen: null, desc: 'Defender el Estado de las autonomías tal como es.' },
      { id: 'centralist', name: 'Centralista', cen: 0.75, desc: 'Una sola nación: más poder para el Gobierno central.' },
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
    url: 'vendor/provinces.json', // es-atlas 0.6.0 (límites del IGN), alojado aquí
    object: 'provinces', regionsObject: 'autonomous_regions', projection: 'geoConicConformalSpain',
    regionCodes: { '01': 'AND', '02': 'ARA', '03': 'AST', '04': 'BAL', '05': 'CAN', '06': 'CNT', '07': 'CYL', '08': 'CLM', '09': 'CAT', '10': 'VAL', '11': 'EXT', '12': 'GAL', '13': 'MAD', '14': 'MUR', '15': 'NAV', '16': 'PV', '17': 'RIO', '18': 'CEU', '19': 'MEL' },
    inset: ['05'],
    codes: { '01': 'Araba/Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona',
      '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona',
      '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa', '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida', '26': 'La Rioja',
      '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
      '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
      '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla' },
  };

  S.adaptToEra = function (X) {
    if (X.startYear < 2023) {
      Object.assign(X.sims.automation, { name: 'Automatización', local: '', unit: 'robots y software en la economía',
        desc: 'Los robots y el software se extienden por fábricas y oficinas: sube la productividad, pero desaparecen algunos empleos.' });
    }
  };

  /* ---------------------------------------------------------------
   * GOALS (per scenario) & MILESTONES
   *   goal: { title, sim, below|above } | { deficitBelow } | { debtBelow } | { approvalAbove } | { win: true }
   * ------------------------------------------------------------- */
  S.defaultGoals = [
    { id: 'rent', title: 'Bajar el alquiler del 35 % de los ingresos', sim: 'housing', below: 35 / 55 },
    { id: 'jobs', title: 'Bajar el paro del 8 %', sim: 'unemployment', below: 8 / 30 },
    { id: 'deficit', title: 'Bajar el déficit del 2 %', deficitBelow: 0.02 },
    { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
  ];
  const goalsFor = {
    majority: [
      { id: 'rent', title: 'Bajar el alquiler del 33 % de los ingresos', sim: 'housing', below: 33 / 55 },
      { id: 'jobs', title: 'Bajar el paro del 7,5 %', sim: 'unemployment', below: 7.5 / 30 },
      { id: 'debt', title: 'Bajar la deuda del 95 % del PIB', debtBelow: 0.95 },
      { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
    ],
    boom2006: [
      { id: 'rent', title: 'Enfriar la vivienda: alquiler por debajo del 40 % de los ingresos', sim: 'housing', below: 40 / 55 },
      { id: 'renew', title: 'Renovables por encima del 40 % de la electricidad', sim: 'renewables', above: 0.4 },
      { id: 'prod', title: 'Subir el índice de innovación a 45 puntos', sim: 'productivity', above: 0.45 },
      { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
    ],
    crisis2012: [
      { id: 'jobs', title: 'Bajar el paro del 18 %', sim: 'unemployment', below: 18 / 30 },
      { id: 'rp', title: 'Bajar la prima de riesgo de 150 puntos', sim: 'riskPremium', below: 150 / 600 },
      { id: 'deficit', title: 'Bajar el déficit del 3 %', deficitBelow: 0.03 },
      { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
    ],
    proces2017: [
      { id: 'tension', title: 'Bajar el apoyo a la independencia del 40 %', sim: 'tension', below: 0.5 },
      { id: 'jobs', title: 'Bajar el paro del 13 %', sim: 'unemployment', below: 13 / 30 },
      { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
    ],
    random: [
      { id: 'approval', title: 'Subir la aprobación por encima del 50 %', approvalAbove: 0.5 },
      { id: 'deficit', title: 'Bajar el déficit del 3 %', deficitBelow: 0.03 },
      { id: 'win', title: 'Ganar las próximas elecciones generales', win: true },
    ],
  };
  S.goalsForPreset = (id) => goalsFor[id] || S.defaultGoals;

  // One-off milestones, celebrated the first time they happen
  S.milestones = [
    { id: 'u10', title: 'El paro baja del 10 %', test: (c) => c.sims.unemployment < 10 / 30 },
    { id: 'u8', title: 'El paro baja del 8 %', test: (c) => c.sims.unemployment < 8 / 30 },
    { id: 'u6', title: 'El paro baja del 6 %: casi pleno empleo', test: (c) => c.sims.unemployment < 6 / 30 },
    { id: 'def3', title: 'El déficit vuelve por debajo del 3 %', test: (c) => c.deficit < 0.03 },
    { id: 'surplus', title: 'Superávit presupuestario', test: (c) => c.deficit < 0 },
    { id: 'debt100', title: 'La deuda baja del 100 % del PIB', test: (c) => c.debt < 1 },
    { id: 'debt80', title: 'La deuda baja del 80 % del PIB', test: (c) => c.debt < 0.8 },
    { id: 'rent35', title: 'El alquiler baja del 35 % de los ingresos', test: (c) => c.sims.housing < 35 / 55 },
    { id: 'growth3', title: 'La economía crece por encima del 3 %', test: (c) => c.sims.growth > 0.6 },
    { id: 'rp50', title: 'Prima de riesgo por debajo de 50 puntos', test: (c) => c.sims.riskPremium < 50 / 600 },
    { id: 'renew70', title: 'Las renovables superan el 70 % de la electricidad', test: (c) => c.sims.renewables > 0.7 },
    { id: 'births', title: 'La natalidad vuelve a superar 1,3 hijos por mujer', test: (c) => c.sims.birthrate > 0.36 },
    { id: 'clean', title: 'La transparencia supera los 70 puntos', test: (c) => c.sims.corruption < 0.3 },
    { id: 'approval50', title: 'La aprobación supera el 50 %', test: (c) => c.approval > 0.5 },
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
    simTarget('jobs', 'unemployment', -2.5 / 30, (t) => `Bajar el paro al ${t}`, 'workers 0.05, unemployed 0.12, youth 0.05', 6 / 30),
    simTarget('rents', 'housing', -4 / 55, (t) => `Bajar el alquiler al ${t} de los ingresos`, 'tenants 0.12, youth 0.08'),
    simTarget('waits', 'health', 0.07, (t) => `Reducir la espera quirúrgica a ${t}`, 'pensioners 0.08, everyone 0.02'),
    simTarget('green', 'renewables', 0.08, (t) => `Subir las renovables al ${t} de la electricidad`, 'environmentalists 0.1, youth 0.03'),
    simTarget('crime', 'crime', -0.05, (t) => `Reducir la criminalidad a ${t}`, 'pensioners 0.05, patriots 0.05, parents 0.03'),
    simTarget('tension', 'tension', -0.1, (t) => `Bajar el apoyo a la independencia al ${t}`, 'patriots 0.07, catalanNat -0.04', 0.35),
    (st) => {
      const d = st.lastBudget.deficit / st.gdp;
      if (d < 0.01) return null;
      const t = Math.max(0.005, d - 0.015);
      return { id: 'deficit', type: 'deficit', below: t, keep: false, title: `Bajar el déficit al ${(t * 100).toFixed(1).replace('.', ',')} % del PIB`, groups: 'wealthy 0.05, selfEmployed 0.04, pensioners 0.02' };
    },
    polTarget('minWage', 'minWage', (v) => (v < 0.9 ? Math.min(1, v + 0.12) : null), (t) => `Subir el salario mínimo a ${Math.round(800 + t * 700)} €`, 'workers 0.08, lowIncome 0.08, selfEmployed -0.04'),
    polTarget('housing', 'publicHousing', (v) => Math.max(0.6, v + 0.25), 'Construir vivienda pública a gran escala', 'tenants 0.1, youth 0.06'),
    polTarget('childcare', 'childcare', 0.75, 'Escuela infantil gratuita para todos', 'parents 0.1, feminists 0.04'),
    polTarget('hours', 'workWeek', 0.5, 'Reducir la jornada laboral', 'workers 0.09, selfEmployed -0.05'),
    polTarget('borders', 'borderControl', (v) => Math.max(0.7, v + 0.2), 'Recuperar el control de las fronteras', 'patriots 0.1, immigrants -0.06'),
    polTarget('catalonia', 'catalanFiscal', 0.3, 'Un nuevo modelo de financiación para Cataluña', 'catalanNat 0.12, patriots -0.06'),
    (st) => (pv(st, 'pensions') >= 0.6 ? { id: 'pensions', type: 'policies', demands: [['pensions', 0.6, 'min']], keep: true, title: 'Las pensiones siempre subirán con el IPC', groups: 'pensioners 0.12' } : null),
    (st) => ({ id: 'noTax', type: 'policies', demands: [['incomeTax', pv(st, 'incomeTax'), 'max'], ['vat', pv(st, 'vat'), 'max']], keep: true, title: 'Ni una subida del IRPF ni del IVA', groups: 'selfEmployed 0.06, wealthy 0.06, everyone 0.02' }),
    (st) => (pv(st, 'incomeTax') > 0.25 ? { id: 'cutTax', type: 'policies', demands: [['incomeTax', pv(st, 'incomeTax') - 0.1, 'max']], keep: false, title: 'Bajar el IRPF', groups: 'wealthy 0.08, selfEmployed 0.06, everyone 0.02' } : null),
    (st) => (!st.policies.selfDetermination.active ? { id: 'noReferendum', type: 'policies', demands: [['selfDetermination', 0, 'off']], keep: true, title: 'Nunca habrá un referéndum de independencia', groups: 'patriots 0.1, catalanNat -0.05' } : null),
  ];


  G.SCENARIOS = G.SCENARIOS || {};
  G.SCENARIOS.spain = S;
})(typeof window !== 'undefined' ? window : globalThis);
