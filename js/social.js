/* La Moncloa: lo que se dice en las redes.
 *
 * Comentarios de ciudadanos, políticos y medios sobre lo que ya ha pasado en
 * la partida. No aporta información nueva: pone voz y cara a los cambios de
 * política, las crisis, los sucesos, las encuestas y el ánimo de cada grupo.
 * Todos los nombres, cuentas y medios son inventados.
 */
(function (G) {
  'use strict';

  // ── Azar propio, para no tocar el de la simulación ──────────
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const fmtPct = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';

  // ── Ciudadanos que vuelven a aparecer ───────────────────────
  // Uno o dos por grupo de votantes, cada uno con su manera de hablar.
  const CAST = {
    pensioners: [
      { name: 'Encarna Molina', handle: 'laencarna_', bio: 'Jubilada. Cuatro nietos. Me leo la prensa entera cada mañana.' },
      { name: 'Paco Herrero', handle: 'pacoherrero_jub', bio: 'Jubilado ferroviario. Petanca y opiniones.' },
    ],
    youth: [
      { name: 'Nerea G.', handle: 'nerea_noduerme', bio: '23. Dos másteres y un contrato de prácticas.' },
      { name: 'Álex Prieto', handle: 'alexprieto_', bio: 'Estudiante. Vivo con mis padres hasta nuevo aviso.' },
    ],
    parents: [{ name: 'Raquel Soto', handle: 'raquelymasraquel', bio: 'Madre de dos. Logística familiar nivel experto.' }],
    workers: [{ name: 'Juanma Ortega', handle: 'juanma_turnonoche', bio: 'Delegado sindical. Turno de noche en la fábrica.' }],
    unemployed: [{ name: 'Sergio Lara', handle: 'sergio_buscacurro', bio: 'En paro. Mando currículums como quien echa la primitiva.' }],
    lowIncome: [{ name: 'Toñi Fernández', handle: 'toni_finde', bio: 'Limpiadora. Llegar a fin de mes es mi cardio.' }],
    selfEmployed: [{ name: 'Rubén Calvo', handle: 'rubencalvo_fontanero', bio: 'Autónomo. Mi jefe soy yo y me exploto.' }],
    wealthy: [{ name: 'Íñigo de la Vega', handle: 'inversor_tranquilo', bio: 'Inversor. Liberal. Pádel los domingos.' }],
    publicSector: [{ name: 'Pilar Díez', handle: 'pilar_funcionaria', bio: 'Funcionaria. Sí, trabajamos.' }],
    farmers: [{ name: 'Antonio Jiménez', handle: 'antonio_olivar', bio: 'Olivarero. El campo no se rinde.' }],
    rural: [{ name: 'Maite Sanz', handle: 'maite_desdelpueblo', bio: 'Desde un pueblo de 60 vecinos. Una raya de cobertura.' }],
    catholics: [{ name: 'Fernando Alcalá', handle: 'fer_alcala', bio: 'Católico, padre de cinco. Hablo claro.' }],
    secular: [{ name: 'Clara Benet', handle: 'clarabenet', bio: 'Profe de filosofía. Progre de manual y a mucha honra.' }],
    environmentalists: [{ name: 'Lola Verdú', handle: 'lolaverdu_bici', bio: 'No hay planeta B. Bici, huerto urbano y cabreo.' }],
    feminists: [{ name: 'Ana Quintana', handle: 'anaquintana_', bio: 'Abogada. Feminista. Ni un paso atrás.' }],
    patriots: [{ name: 'Manolo Cortés', handle: 'manolo_patria', bio: 'España 🇪🇸 Orgulloso de mi tierra y de mi bandera.' }],
    catalanNat: [{ name: 'Marc Soler', handle: 'marcsoler_cat', bio: 'Independentista. Bon dia i bona sort.' }],
    basqueNat: [{ name: 'Ane Urrutia', handle: 'aneurrutia', bio: 'Euskaldun. Kaixo!' }],
    immigrants: [{ name: 'Wilson Castro', handle: 'wilson_vallekas', bio: 'Llegué hace nueve años. Ahora soy de aquí.' }],
    tenants: [{ name: 'Marta Gil', handle: 'marta_alquila', bio: 'Inquilina. Mi piso tiene vistas a otra pared.' }],
    tourismWorkers: [{ name: 'Kevin Ramos', handle: 'kevin_camarero', bio: 'Camarero en la costa. Temporada alta todo el año.' }],
    bullfighting: [{ name: 'Rafael Romero', handle: 'rafa_tendido7', bio: 'Aficionado. Tendido 7 de corazón.' }],
  };
  const EXTRAS = {
    cunado: { name: 'Luismi', handle: 'elcunadoquelosabe', bio: 'Opinador profesional. Lo vi venir.' },
    abuela: { name: 'Tía Puri', handle: 'tiapuri_opina', bio: 'Tengo 81 años y redes sociales. Tiemblen.' },
    teacher: { name: 'Profe Javi', handle: 'profejavi_', bio: 'Profe de instituto. Corrijo exámenes y tuits.' },
    nurse: { name: 'Bea Enfermera', handle: 'bea_urgencias', bio: 'Enfermera de urgencias. Turnos de 12 horas.' },
    doctor: { name: 'Dr. Ruiz', handle: 'drruiz_familia', bio: 'Médico de familia. 50 pacientes al día.' },
    student: { name: 'Hugo M.', handle: 'hugo_selectividad', bio: 'Estudiando. O eso dicen.' },
  };

  // ── Políticos (inventados) ──────────────────────────────────
  const POLS = {
    UC: { name: 'Mercedes Arranz', handle: 'MercedesArranz', bio: 'Líder de Unión Conservadora.' },
    VP: { name: 'Gonzalo Valdivieso', handle: 'GValdivieso', bio: 'Presidente de Voz Patriótica. 🇪🇸' },
    IP: { name: 'Lucía Ferrándiz', handle: 'luciaferrandiz', bio: 'Portavoz de Izquierda Plural.' },
    CC: { name: 'Borja Salinas', handle: 'borjasalinas', bio: 'Centro Cívico. Ni rojos ni azules.' },
    EC: { name: 'Núria Casals', handle: 'nuriacasals', bio: 'Esquerra Catalana al Congrés.' },
    CL: { name: 'Pere Vilaró', handle: 'perevilaro', bio: 'Catalunya Lliure.' },
    PV: { name: 'Mikel Arrieta', handle: 'mikelarrieta', bio: 'Partido Vasco.' },
    EA: { name: 'Iker Goikoetxea', handle: 'ikergoiko', bio: 'Ezker Abertzalea.' },
    BG: { name: 'Uxía Pereiro', handle: 'uxiapereiro', bio: 'Bloque Galego.' },
    UCan: { name: 'Dácil Hernández', handle: 'dacilhernandez', bio: 'Unión Canaria.' },
  };
  // Tono de cada partido al reaccionar a un cambio de política
  const PARTY_VOICE = {
    UC: {
      no: ['Otra ocurrencia del Gobierno de {pres}: {pol}. España necesita un Gobierno serio, no un experimento permanente.',
        'Lo de {pol} lo van a pagar las familias. Lo decimos hoy para que nadie diga mañana que no avisamos.',
        'Señor {presS}, con lo de {pol} vuelve a gobernar a golpe de titular. Cuando quiera hablamos de cosas serias.'],
      yes: ['Celebramos que {pres} rectifique y haga lo que llevamos años proponiendo: {pol}. Tarde, pero llega.',
        'Lo de {pol} es una buena noticia. Lástima que hayan hecho falta tantos meses para que el Gobierno nos copie.'],
    },
    VP: {
      no: ['¡{pol}! Mientras los españoles de bien pagan la fiesta, {pres} juega con su futuro. No nos van a callar. 🇪🇸',
        'Lo de {pol} es exactamente lo que esperábamos de este Gobierno. España no se merece esto. Nos vemos en las urnas.',
        'Hoy {pres} ha decidido {verb} {pol}. Mañana, quién sabe. Lo único fijo es que siempre pierde la España que madruga.'],
      yes: ['Hasta un reloj parado acierta dos veces al día. {pol}: lo propusimos nosotros primero. De nada, España. 🇪🇸',
        'Bienvenido sea lo de {pol}. Si {pres} quiere seguir copiando nuestro programa, tenemos más páginas.'],
    },
    IP: {
      no: ['{pol}. Otra vez gobernando para los de siempre. La gente no se va a olvidar de esto.',
        'Lo de {pol} no estaba en ningún programa que yo recuerde. Así no, {pres}. Así no.',
        'Os prometieron un Gobierno valiente y os han traído {pol}. Seguiremos en la calle.'],
      yes: ['Lo de {pol} es un paso, pero se queda corto. Sin la presión de la calle esto no habría pasado. Seguimos.',
        'Sí, apoyamos lo de {pol}. Y sí, vamos a seguir exigiendo mucho más. Las dos cosas a la vez.'],
    },
    CC: {
      no: ['Ni rojos ni azules: sentido común. Y lo de {pol} no lo tiene. Os explico por qué en un hilo 🧵👇',
        'He leído lo de {pol} tres veces para ver si lo entendía mal. No lo entendía mal. #SentidoComún'],
      yes: ['Bien por lo de {pol}. Cuando el Gobierno hace algo sensato, lo decimos. Así de fácil. #SentidoComún',
        'Lo de {pol} va en la buena dirección. Nadie lo va a reconocer, así que lo hago yo.'],
    },
  };
  const REGIONAL_VOICE = {
    no: ['Desde {region} miramos lo de {pol} con mucha preocupación. Tomamos nota para la próxima votación.',
      'Lo de {pol} vuelve a demostrar que en Madrid no entienden nada. Nuestros votos tienen un precio y no es este.'],
    yes: ['Lo de {pol} es fruto de nuestro trabajo en el Congreso. Ni las gracias, pero bueno.',
      'Un paso adelante con {pol}. Lo hemos arrancado nosotros, que quede claro.'],
  };
  const PARTY_REGION = { EC: 'Cataluña', CL: 'Cataluña', PV: 'Euskadi', EA: 'Euskal Herria', BG: 'Galicia', UCan: 'Canarias' };

  // ── Medios (inventados) ─────────────────────────────────────
  const MEDIA = {
    diario: { name: 'El Diario Nacional', handle: 'diarionacional', bio: 'Información desde 1978.', media: true },
    cronica: { name: 'Crónica Exprés', handle: 'cronicaexpres', bio: 'Lo que nadie te cuenta. Hasta ahora.', media: true },
    trinchera: { name: 'La Trinchera Digital', handle: 'latrinchera_', bio: 'Periodismo sin complejos.', media: true },
    altavoz: { name: 'El Altavoz', handle: 'elaltavoz_', bio: 'La voz de los que no tienen voz.', media: true },
    nocturno: { name: 'El Nocturno', handle: 'elnocturno_', bio: 'Noticias falsas, pero solo un poco. Sátira.', media: true, satire: true },
    sondeos: { name: 'Sondeos Iberia', handle: 'sondeosiberia', bio: 'Encuestas y electoral.', media: true },
    meteo: { name: 'Meteo Ibérica', handle: 'meteoiberica', bio: 'El tiempo, sin dramas. Bueno, con algunos.', media: true },
    economista: { name: 'Economía en Vena', handle: 'economiaenvena', bio: 'Gráficos, hilos y café.', media: false },
    boletin: { name: 'Bot del Boletín', handle: 'bot_boletin', bio: 'Publico lo que sale en el Boletín Oficial. Soy un bot.', media: false, bot: true },
  };

  // ── Reacciones a cambios concretos de política ──────────────
  // [quién, texto]; quién = grupo de votantes, extra o medio
  const POLICY = {
    incomeTax: {
      up: [['wealthy', 'Me acaban de subir el IRPF. Voy a hacer lo que hace todo el mundo en mi situación: quejarme en redes y seguir igual.'],
        ['selfEmployed', 'Sube el IRPF. Mi gestor me ha llamado solo para decirme «lo siento». Ni hola.']],
      down: [['workers', 'Bajan el IRPF y yo ya estoy haciendo cuentas: me da para un café más al mes. Bueno, medio.'],
        ['publicSector', 'Bajada del IRPF. Muy bien. Y los hospitales y colegios se pagan con… ¿buenos deseos?']],
    },
    vat: {
      up: [['lowIncome', 'Sube el IVA. El súper ya era deporte de riesgo; ahora es deporte extremo.'],
        ['selfEmployed', 'Subida de IVA. Ahora toca explicarle a cada cliente que la factura no la he subido yo. Uno a uno.']],
      down: [['parents', 'Baja el IVA y el carro de la compra me ha salido igual. Misterios de la economía que nadie me explica.']],
    },
    corpTax: {
      up: [['cronica', 'Las grandes empresas, «muy preocupadas» por la subida de Sociedades. Nosotros, preocupadísimos por ellas.']],
      down: [['altavoz', 'El Gobierno baja el Impuesto de Sociedades. Los consejos de administración lo celebran con moderación: solo una botella por cabeza.']],
    },
    wealthTax: {
      up: [['wealthy', 'Me han dicho que en Portugal hace muy buen tiempo todo el año. Solo lo comento.']],
      down: [['secular', 'Bajan el impuesto a los que tienen tres casas. A los que no tenemos ninguna, ya tal.']],
    },
    inheritanceTax: {
      up: [['pensioners', 'Me he pasado la vida ahorrando para dejarles algo a mis nietos y ahora resulta que también se lo queda Hacienda.']],
      down: [['catholics', 'Por fin heredar no es un castigo. Lo de mis padres lo ganaron ellos, no el Estado.']],
    },
    fuelTax: {
      up: [['farmers', 'Sube el gasóleo. Mi tractor bebe más que yo en las fiestas del pueblo, y eso es decir mucho.'],
        ['rural', 'Gasolina más cara. En mi pueblo el autobús pasa dos veces por semana y el médico está a 40 km. Pero vamos, que coja la bici.']],
      down: [['environmentalists', 'Bajan el impuesto a la gasolina. El planeta, encantado. Es broma: el planeta está fatal.']],
    },
    sinTax: {
      up: [['cunado', 'Suben el tabaco y el alcohol. Yo no fumo, pero me parece un ataque a la libertad. Pásame el mechero.']],
      down: [['doctor', 'Baja el impuesto al tabaco. Mi consulta de neumología agradece la clientela fija.']],
    },
    touristTax: {
      up: [['tourismWorkers', 'Tasa turística: el guiri paga dos euros más y yo le explico tres veces que no me los quedo yo.']],
      down: [['tenants', 'Quitan la tasa turística. Mi barrio, que ya era un parque temático, ahora es un parque temático gratis.']],
    },
    windfallTax: {
      up: [['cronica', 'Las eléctricas, indignadísimas con el nuevo gravamen. Atención, porque podrían subirte la luz. Ah, que ya lo hacían.']],
    },
    carbonTax: {
      up: [['farmers', 'Impuesto al carbono. Que vengan a explicarle a mis vacas lo de las emisiones.']],
    },
    minWage: {
      up: [['workers', 'Sube el salario mínimo. Mi compañera ha llorado en el vestuario. De alegría, por una vez.'],
        ['selfEmployed', 'Sube el salario mínimo. Me alegro por mis chavales, de verdad. Ahora que alguien me diga cómo lo pago.']],
      down: [['lowIncome', 'Congelan el salario mínimo. El alquiler, la luz y el súper no se han enterado y siguen subiendo.']],
    },
    workWeek: {
      up: [['youth', 'Menos horas de jornada. Por fin podré hacer cosas de gente normal, como ver la luz del sol un martes.'],
        ['selfEmployed', '¿Jornada más corta? Los autónomos seguimos con la de siempre: de 7 a cuando caiga.']],
      down: [['workers', 'Alargan la jornada. Mi hija me pregunta si vivo aquí o solo vengo a dormir. Ni yo lo sé.']],
    },
    labourProtection: {
      down: [['workers', 'Abaratan el despido. En la fábrica ya hay apuestas sobre quién es el primero.']],
      up: [['selfEmployed', 'Más protección laboral. Genial. Contratar a alguien ya era más difícil que montar un mueble sueco.']],
    },
    pensions: {
      up: [['pensioners', 'Me suben la pensión. Mi nieto dice que ahora soy «inversora». Yo creo que se refiere a que le invito a churros.'],
        ['youth', 'Suben las pensiones. Me alegro por mis abuelos, en serio. Yo cobraré la mía en forma de abrazo, intuyo.']],
      down: [['pensioners', 'Congelan las pensiones. Cuarenta y dos años cotizados para esto. Me voy a poner el chándal y a la calle.']],
    },
    retirementAge: {
      up: [['workers', 'Retrasan la jubilación. Ya puedo ir encargando la mecedora para usarla directamente en el tajo.']],
      down: [['youth', 'Adelantan la jubilación. Bonito detalle con los que ya están. A los que venimos detrás, ya si eso.']],
    },
    unemploymentBenefit: {
      up: [['unemployed', 'Mejoran el paro. Por fin no tengo que elegir entre pagar la luz o comer caliente. Las dos cosas, a la vez, como los ricos.']],
      down: [['unemployed', 'Recortan el paro. Me dicen que así me «incentivan» a buscar trabajo. Ya lo busco. Lo que no encuentro es el trabajo.']],
    },
    minimumIncome: {
      up: [['lowIncome', 'Sube el ingreso mínimo. Para muchos no es un lujo: es la diferencia entre llegar o no llegar.']],
      down: [['cunado', 'Recortan las paguitas. Lo llevo diciendo desde siempre. ¿Que si yo cobro alguna ayuda? Eso no viene al caso.']],
    },
    childBenefit: { up: [['parents', 'Ayuda por hijo. Con dos críos, eso son… unas zapatillas cada uno. A los tres meses ya no les valen, pero bueno.']] },
    parentalLeave: { up: [['parents', 'Amplían los permisos de nacimiento. Mi bebé no lo sabe aún, pero acaba de ganar unas semanas de papá.']] },
    childcare: { up: [['parents', 'Escuelas infantiles gratis. He calculado lo que me ahorro y me he tenido que sentar.']] },
    healthcare: {
      up: [['nurse', 'Más dinero para la sanidad pública. Lo creeré cuando vea un compañero más en mi turno, pero hoy me dejo ilusionar.']],
      down: [['doctor', 'Recortes en sanidad. Ya puedo atender a 50 pacientes al día. Ahora a 60. Lo próximo, por telepatía.']],
    },
    healthOutsourcing: { up: [['nurse', 'Más conciertos con la privada. Mientras tanto, en mi planta, sin camas. Cosas que pasan.']] },
    education: {
      up: [['teacher', 'Más inversión en educación. Igual este año la calefacción del aula funciona antes de marzo.']],
      down: [['teacher', 'Recortes en educación. Seremos 34 en clase. Los nombres me los aprendo para junio, si eso.']],
    },
    grants: { up: [['student', 'Suben las becas. Mi madre ha llorado. Yo también, pero porque ahora tengo que aprobar.']] },
    dentalCare: { up: [['pensioners', 'Dentista en la Seguridad Social. A mis años, poder masticar un filete es casi un programa electoral.']] },
    publicTransport: {
      up: [['youth', 'Abono de transporte más barato. Me ahorro lo justo para un café de especialidad al mes. Cambio de vida total.']],
      down: [['workers', 'Recortan el transporte público. El tren de las 6:40 ya iba lleno; ahora iremos colgados como en las películas.']],
    },
    infrastructureInv: { up: [['rural', 'Anuncian inversión en trenes y carreteras. En mi pueblo seguimos esperando el tren que prometieron cuando era pequeña.']] },
    broadband: { up: [['rural', '¡Fibra para los pueblos! Este tuit lo he podido mandar a la primera. Histórico.']] },
    police: {
      up: [['trinchera', 'Por fin más agentes en la calle. Algo es algo, aunque llegue tarde.']],
      down: [['patriots', 'Recortan en Policía y Guardia Civil. Luego que no se extrañen.']],
    },
    securityLaw: {
      up: [['secular', 'Endurecen la ley de seguridad ciudadana. Para quejarme de esto, ¿tengo que pedir permiso por escrito?']],
      down: [['patriots', 'Suavizan la ley de seguridad. Barra libre, señores.']],
    },
    antiCorruption: { up: [['cunado', 'Más medios contra la corrupción. Ahora a ver cuántos de los que lo han votado acaban investigados.']] },
    defence: {
      up: [['altavoz', 'Más dinero para Defensa. Para la vivienda, «no hay margen». Para tanques, sí.']],
      down: [['patriots', 'Recortan en Defensa. Nuestros militares merecen más. Mucho más.']],
    },
    borderControl: {
      up: [['immigrants', 'Endurecen las fronteras. Yo crucé con una maleta y muchos sueños. Hoy pago impuestos. Pensadlo un poco.']],
      down: [['patriots', 'Bajan el control fronterizo. ¿En serio nadie ve lo que viene?']],
    },
    regularisation: {
      up: [['immigrants', 'Regularización. Mi primo lleva cinco años trabajando en negro en el campo. Mañana, por fin, tendrá papeles. 🙏'],
        ['patriots', 'Regularización masiva. Efecto llamada de manual. Luego vendrán los lloros.']],
    },
    cannabis: {
      up: [['cunado', 'Legalizan el cannabis. Yo no fumo, pero conozco a un amigo de un amigo que está muy contento.'],
        ['catholics', 'Legalizan el cannabis. Qué ejemplo para nuestros hijos. Qué tristeza.']],
      down: [['youth', 'Vuelven a prohibir el cannabis. La gente seguirá fumando, pero ahora sin factura. Bravo.']],
    },
    monarchy: {
      up: [['secular', 'Más presupuesto para la Casa Real. En mi barrio el ambulatorio cierra por las tardes, pero oye, prioridades.']],
      down: [['patriots', 'Recortan a la Casa Real. Primero la Corona, ¿y luego qué?']],
    },
    catalanFiscal: {
      up: [['catalanNat', 'Financiació singular. No és la independència, però avui brindem amb cava. 🥂'],
        ['patriots', 'Privilegios para Cataluña. Y los demás, a pagar. Igualdad entre españoles, decían.']],
    },
    dialogue: {
      up: [['catalanNat', 'Mesa de diálogo. Hablar siempre es mejor que no hablar. Ya veremos si alguien escucha.']],
      down: [['catalanNat', 'Se acaba el diálogo. Bueno, en realidad nunca había empezado del todo.']],
    },
    languages: {
      up: [['basqueNat', 'Más apoyo a las lenguas cooficiales. Eskerrik asko! Igual en el Congreso por fin se entienden todos. O no.'],
        ['patriots', 'Pinganillos en el Congreso. Pagamos traductores para que se entiendan personas que hablan el mismo idioma.']],
    },
    recentralisation: {
      up: [['catalanNat', 'Recentralización. Gracias, Madrid: habéis hecho más independentistas en una semana que nosotros en diez años.'],
        ['patriots', 'Por fin mano dura. Una nación, una ley.']],
      down: [['patriots', 'Se acabó el 155. Ya están otra vez con lo suyo, ya veréis.']],
    },
    selfDetermination: {
      up: [['catalanNat', 'Referéndum pactado. Llevo años esperando esto. No me lo creo. Me lo creo. No me lo creo. 🗳️'],
        ['trinchera', 'El Gobierno pacta un referéndum. España, en venta por unos votos.']],
    },
    ruralPlan: { up: [['rural', 'Plan contra la despoblación. Si traen médico y cajero, me caso con el ministro. Que conste.']] },
    nuclearPhaseout: {
      up: [['environmentalists', 'Cierre nuclear. Un paso valiente. Y ahora, renovables a tope, que no se nos olvide.'],
        ['economista', 'Cierran las nucleares. Hilo sobre qué pasa con la factura de la luz cuando no sopla el viento 🧵 (spoiler: sube)']],
      down: [['environmentalists', 'Alargan las nucleares. Herencia para nuestros tataranietos. De nada, chavales.']],
    },
    renewableSubsidy: { up: [['environmentalists', 'Más renovables. Hoy me he abrazado a un molino. Metafóricamente. Bueno, no tanto.']] },
    lowEmissionZones: {
      up: [['rural', 'Zonas de bajas emisiones. Muy bien para el que vive en el centro. Yo vengo del pueblo con un coche de 2004. ¿Qué hago, vengo en burro?'],
        ['environmentalists', 'Zonas de bajas emisiones. Mi asma lo agradece. Los del diésel, no tanto.']],
    },
    tolls: { up: [['selfEmployed', 'Peajes en las autovías. Mi furgoneta y yo os mandamos saludos desde la nacional, a 80, detrás de un camión.']] },
    irrigationLimits: { up: [['farmers', 'Límites al regadío. Sin agua no hay campo, y sin campo no hay comida. No es tan difícil.']] },
    wildfirePrevention: { up: [['rural', 'Más dinero para prevenir incendios. Los montes se limpian en invierno, no se apagan en agosto. Por fin alguien se entera.']] },
    publicHousing: {
      up: [['tenants', 'Más vivienda pública. Me apunto a la lista. Me tocará cuando me jubile, pero oye, ilusión.']],
      down: [['tenants', 'Recortan vivienda pública. Seguiré compartiendo piso a los 38. Como un Erasmus eterno, pero sin fiesta.']],
    },
    rentControl: {
      up: [['tenants', 'Topan los alquileres. Mi casero me ha escrito «tenemos que hablar». Nunca me había dado tanto miedo un mensaje.'],
        ['wealthy', 'Control del alquiler. Mi piso de la playa saldrá del mercado antes de que acabe el día. Se veía venir.']],
      down: [['tenants', 'Quitan el tope al alquiler. Mi casero ya me ha mandado un audio de cuatro minutos. Lo voy a escuchar sentada.']],
    },
    touristFlats: {
      up: [['tenants', 'Límites a los pisos turísticos. Igual mi vecino deja de ser una maleta con ruedas distinta cada viernes.']],
      down: [['tourismWorkers', 'Barra libre de pisos turísticos. Trabajo en el centro y vivo a una hora. Cosas del progreso.']],
    },
    goldenVisa: { down: [['altavoz', 'Adiós al visado de oro. Comprar un chalé ya no te da pasaporte. Qué tiempos tan duros para algunos.']] },
    firstHome: { up: [['youth', 'Avales para la primera vivienda. Ya solo me falta encontrar una vivienda. Y un sueldo. Y suerte.']] },
    emptyHomesTax: { up: [['wealthy', 'Impuesto a las viviendas vacías. El piso de mi tía está «vacío» porque va dos semanas al año. Que lo sepan.']] },
    genderEquality: {
      up: [['feminists', 'Más recursos contra la violencia de género. Cada euro aquí salva vidas. Así de simple.']],
      down: [['feminists', 'Recortan en igualdad. Tomamos nota. Nos vemos el 8M.']],
    },
    churchFunding: {
      up: [['secular', 'Más dinero para la Iglesia. Estado aconfesional, decían en clase.']],
      down: [['catholics', 'Recortan a la Iglesia. Los comedores sociales que mantiene la parroquia de mi barrio no los va a pagar el ministro.']],
    },
    bullfighting: {
      up: [['bullfighting', 'Protegen la tauromaquia. Hoy brindo en la plaza. ¡Olé!'], ['environmentalists', 'Más dinero público para los toros. Un clásico de nuestro tiempo.']],
      down: [['bullfighting', 'Retiran la protección a los toros. Es nuestra cultura. Después irán a por la paella, ya verás.']],
    },
    animalWelfare: {
      up: [['environmentalists', 'Ley de bienestar animal. Mi perra Lola también vota, aunque solo con la cola.'],
        ['farmers', 'Ley de bienestar animal. Ahora que me la explique alguien que haya visto una vaca en persona.']],
    },
    euthanasia: { up: [['catholics', 'Ley de eutanasia. Hoy rezo un poco más que de costumbre.'], ['secular', 'Ley de eutanasia. Morir con dignidad es un derecho. Gracias a las familias que lo pelearon.']] },
    memoryLaw: { up: [['patriots', 'Otra ley de memoria. Ellos a remover el pasado y los demás a pagar la luz.']] },
    civilService: {
      up: [['publicSector', 'Más plazas de empleo público. Mi academia de oposiciones ha triplicado alumnos. Viva el pupitre.']],
      down: [['publicSector', 'Recortan el empleo público. Seremos menos para hacer lo mismo. Pero luego, la culpa de la cola, del funcionario.']],
    },
    energyBonus: { up: [['lowIncome', 'Más bono social eléctrico. Este invierno igual pongo la calefacción sin calcular cuánto me cuesta cada minuto.']] },
    smeSupport: { up: [['selfEmployed', 'Ayudas para autónomos. Ya me han mandado el formulario: 46 páginas. Lo relleno en mis ratos libres, que no tengo.']] },
    farmSubsidy: {
      up: [['farmers', 'Más ayudas al campo. Algo es algo. Ahora que paguen lo justo por el kilo, que es lo que de verdad queremos.']],
      down: [['farmers', 'Recortan las ayudas al campo. Sacamos los tractores otra vez. Ya nos conocéis.']],
    },
    tourismPromo: { up: [['tourismWorkers', 'Más promoción turística. Este verano no voy a ver a mi familia. Bueno, como siempre.']] },
    industrialPolicy: { up: [['workers', 'Plan industrial. Si vuelven a abrir una fábrica en mi comarca, me compro una camiseta del ministro.']] },
    rnd: { up: [['economista', 'Más dinero en I+D. Mi gráfico favorito, por fin con una línea que sube y no es la deuda. Hilo 🧵']] },
    freeTrade: { up: [['farmers', 'Nuevo acuerdo de libre comercio. Me compiten con naranjas que vienen de la otra punta del mundo. Bonito.']] },
    foreignBuyers: { up: [['tenants', 'Impuesto a compradores extranjeros. Igual mi barrio deja de estar en venta en tres idiomas.']] },
    landReform: { up: [['economista', 'Nueva Ley del Suelo. Por si alguien tenía dudas: el precio de la vivienda va del suelo. Literal.']] },
    integration: { up: [['immigrants', 'Más dinero para integración. Clases de castellano para mi madre. Ya pide el pan sin señalar.']] },
    publicEnergy: { up: [['cronica', 'El Gobierno crea una eléctrica pública. ¿Te bajará la factura? Lo que dicen los expertos te sorprenderá.']] },
    longTermCare: { up: [['pensioners', 'Más dinero para la dependencia. Mi vecina lleva tres años esperando su ayuda. Que lleguen a tiempo, por favor.']] },
    regionalFunding: { up: [['rural', 'Más financiación autonómica. Ahora a ver si llega a los pueblos o se queda en la capital, como siempre.']] },
    justice: { up: [['cunado', 'Más jueces. Igual mi pleito con el vecino por el seto se resuelve antes de que el seto se muera de viejo.']] },
    socialContrib: {
      up: [['selfEmployed', 'Suben las cotizaciones. Cada mes me llega la cuota y cada mes me pregunto qué hice yo en otra vida.']],
      down: [['workers', 'Bajan las cotizaciones. Muy bien. ¿Y las pensiones de mañana quién las paga? Pregunto para un amigo de 40.']],
    },
  };

  // Reacción genérica de un grupo afectado por un cambio
  const GEN_HAPPY = [
    '{pol}: «{lvl}». No sé de quién ha sido la idea, pero que le suban el sueldo.',
    'Hoy, por una vez, abro las noticias y no me enfado. {pol}. Lo dejo aquí.',
    'Lo de {pol} es lo primero en mucho tiempo pensado para gente como yo. Apuntado.',
    'Llevaba años pidiendo esto. {pol}. Ahora, a ver si de verdad llega.',
    'Mira, {pres}, no te voté, pero lo de {pol} te lo reconozco. Una y no más.',
  ];
  const GEN_ANGRY = [
    '{pol}: «{lvl}». ¿Alguien del Gobierno ha hablado alguna vez con gente como yo? Pregunto.',
    'Lo de {pol} es la gota que colma el vaso. Que no cuenten conmigo en las próximas.',
    'Me acabo de enterar de lo de {pol} y he tenido que salir a dar una vuelta a la manzana.',
    'Gracias, {pres}, por acordarte de nosotros. Ah, no, espera. {pol}. 🙃',
    'Lo de {pol} me lo explican despacito, que no lo entiendo. O sí lo entiendo y por eso estoy así.',
  ];

  // ── Ánimo de cada grupo (sin un cambio concreto detrás) ─────
  const MOOD = {
    pensioners: {
      happy: ['Hoy he ido al banco y no he salido de mal humor. Algo está cambiando en este país.',
        'Mis amigas del centro de mayores dicen que {pres} es muy majo. Yo no lo diría tanto, pero tampoco lo voy a negar.'],
      angry: ['En el centro de mayores no se habla de otra cosa: este Gobierno no se acuerda de nosotros. Y votamos. Todos. Siempre.',
        'Con lo que cobro, este mes he tenido que elegir entre el filete y la calefacción. Me he quedado con la manta.'],
    },
    youth: {
      happy: ['No quiero gafarlo, pero por primera vez veo algo de futuro. Si no lo veis, es que lo he gafado.',
        'Mi grupo de amigos ya no habla solo de irse a Berlín. Ahora también hablamos de quedarnos. Raro.'],
      angry: ['Generación más preparada de la historia: sé tres idiomas y sirvo cafés en los tres.',
        'Mis padres a mi edad tenían piso, coche y dos hijos. Yo tengo una planta. Y está mustia.'],
    },
    parents: {
      happy: ['Este año los libros del cole y el comedor no me han dejado temblando. Pequeñas victorias.'],
      angry: ['Ser madre en este país es un deporte de riesgo. Conciliar, dicen. Ja.',
        'Entre extraescolares, comedor y mochilas, mi cuenta corriente pide asilo político.'],
    },
    workers: {
      happy: ['Asamblea en la fábrica y, por una vez, buenas noticias. Hasta el encargado sonreía. Raro, raro.'],
      angry: ['Llevamos meses viendo cómo se sube todo menos nuestros sueldos. Se está calentando el ambiente en la fábrica.',
        'Si las cosas siguen así, la próxima asamblea no va a ser para hablar. Va a ser para parar.'],
    },
    unemployed: {
      happy: ['Me han llamado de dos entrevistas esta semana. ¡Dos! Ya no sé ni qué ponerme.'],
      angry: ['Currículum número 214 enviado. Respuesta número 0 recibida. Sigo contando.',
        'Me dicen en la oficina de empleo que me reinvente. Ya me he reinventado tres veces. Ahora soy una persona distinta y sigo en paro.'],
    },
    lowIncome: {
      happy: ['Este mes he llegado a fin de mes y me han sobrado 20 euros. Los voy a enmarcar.'],
      angry: ['Hago la compra con la calculadora del móvil. Antes era para las mates del colegio; ahora es para sobrevivir.',
        'Me río por no llorar, pero cada vez me río menos.'],
    },
    selfEmployed: {
      happy: ['Buen trimestre en el negocio. No lo digo muy alto, que Hacienda tiene oídos en todas partes.'],
      angry: ['Mi cuota de autónomo y yo tenemos una relación tóxica: ella siempre gana.',
        'Cerré la persiana a las diez de la noche, he hecho números y he vuelto a abrirla. Por si acaso.'],
    },
    wealthy: {
      happy: ['Las cosas van razonablemente bien. No pienso decirlo más alto por si alguien de Hacienda está leyendo.'],
      angry: ['Mi asesor fiscal me ha recomendado tres cosas: paciencia, Portugal y paciencia.',
        'En el club de pádel ya solo se habla de una cosa: adónde mudarse. Y no es a la casa del vecino.'],
    },
    publicSector: {
      happy: ['Hoy en la oficina hemos comido tarta. No sé de quién era el cumpleaños, pero el ambiente acompañaba.'],
      angry: ['Somos la mitad que hace diez años para hacer el doble. Pero el meme del café del funcionario sigue funcionando, eso sí.'],
    },
    farmers: {
      happy: ['Buena cosecha y precios razonables. No me lo creo ni yo. Voy a tocar madera. De olivo, claro.'],
      angry: ['Vendo el kilo a un precio y lo veo en el súper al triple. Que alguien me explique quién se queda la diferencia.',
        'Los tractores están revisados y con el depósito lleno. Solo digo eso.'],
    },
    rural: {
      happy: ['Este año ha vuelto una familia joven al pueblo. Ya somos 61. Hemos hecho una fiesta. Han venido todos. Los 61.'],
      angry: ['Han cerrado el último cajero del pueblo. Ahora para sacar dinero hay que hacer 30 km. España vaciada, no; España olvidada.',
        'El médico viene un día a la semana. Si te pones malo el martes, te aguantas hasta el jueves.'],
    },
    catholics: {
      happy: ['Hoy, en misa, el párroco hasta habló bien del Gobierno. Me he tenido que pellizcar.'],
      angry: ['Cada día cuesta más defender en público lo que pensamos. Pero lo seguiremos haciendo. Con respeto y sin miedo.'],
    },
    secular: {
      happy: ['Hoy estoy orgullosa de mi país. Mañana probablemente no, pero hoy sí.'],
      angry: ['Me he pasado el día explicando en clase qué es un Estado de derecho. Luego he leído las noticias y he tenido que corregirme.'],
    },
    environmentalists: {
      happy: ['Hoy España ha tirado más de sol y viento que nunca. Me he comprado un helado para celebrarlo. Vegano, obviamente.'],
      angry: ['Otro verano récord. Otro año de excusas. Cuando lleguemos a tomar medidas, igual hacemos la reunión por videollamada desde el fondo del mar.'],
    },
    feminists: {
      happy: ['Pequeños pasos, pero en la buena dirección. Esto lo hemos conseguido juntas.'],
      angry: ['Cada retroceso lo vamos a contestar. En la calle, en las urnas y en cada sobremesa familiar.'],
    },
    patriots: {
      happy: ['Hoy veo banderas en los balcones de mi barrio y me emociono. Esto es España. 🇪🇸'],
      angry: ['Este Gobierno se avergüenza de su propio país. Nosotros no. 🇪🇸',
        'Mi abuelo luchó por esta tierra. Mi padre trabajó por ella. Y ahora mira. Qué pena.'],
    },
    catalanNat: {
      happy: ['Avui fa bon dia a Catalunya. I no parlo del temps.'],
      angry: ['Desde Madrid siempre la misma cantinela. Y luego se sorprenden de que queramos irnos.'],
    },
    basqueNat: {
      happy: ['Buenas noticias para Euskadi. Las negociaciones discretas funcionan. Ya está, eso es todo lo que voy a decir.'],
      angry: ['Desde Madrid parece que Euskadi solo existe cuando necesitan votos. Tomamos nota.'],
    },
    immigrants: {
      happy: ['Hoy le han dado el DNI a mi hermana. Mi madre ha hecho tamales para todo el bloque. España es esto.'],
      angry: ['Trabajo doce horas, pago mis impuestos y aún así hay quien me mira raro en el metro. Esto también es España.'],
    },
    tenants: {
      happy: ['Mi casero no me ha subido el alquiler. Ni un euro. Lo he grabado por si nadie me cree.'],
      angry: ['La mitad de mi sueldo se va en alquiler. La otra mitad, en sobrevivir al alquiler.',
        'Fui a ver un piso: 1.100 euros, sin ventanas, «ideal para gente activa que pasa poco tiempo en casa».'],
    },
    tourismWorkers: {
      happy: ['Temporada de récord y propinas decentes. Mis pies no opinan lo mismo, pero mi cuenta sí.'],
      angry: ['Llevo tres veranos sin vacaciones. Los turistas vienen a descansar; yo vengo a cansarme por ellos.'],
    },
    bullfighting: {
      happy: ['Tarde de toros con la plaza llena. La afición sigue viva. ¡Olé!'],
      angry: ['Cada año nos quieren quitar un poco más. Es nuestra cultura y la vamos a defender.'],
    },
  };

  // ── Sucesos ────────────────────────────────────────────────
  const EVENTS = {
    wildfires: [['meteo', '🔥 Aviso rojo por calor extremo. Hidratación, sombra y nada de barbacoas. Sí, Paco, tú también.'],
      ['rural', 'El fuego se ve desde mi ventana. Los vecinos estamos todos en la plaza con cubos y mangueras. Que no nos olviden cuando se apague.']],
    dana: [['meteo', 'Nuestros pensamientos están con las zonas afectadas por la DANA. Por favor, no crucéis zonas inundadas. Ningún coche vale una vida.'],
      ['cunado', 'Lo de la DANA lo vi venir. No dije nada, pero lo vi venir.']],
    generalStrike: [['workers', 'Hoy en la fábrica no se ha movido ni una máquina. Si esto no les hace pensar, nada lo hará. #HuelgaGeneral'],
      ['selfEmployed', 'Huelga general. Yo hoy también paro. Bueno, no, que si paro no cobro. Pero en espíritu, estoy con vosotros.']],
    scandal: [['nocturno', 'El partido del Gobierno anuncia que investigará a fondo el caso de corrupción «en cuanto encuentre los papeles, que no aparecen».'],
      ['cunado', 'Corrupción en el partido del Gobierno. Sorpresa máxima. Nivel: el sol sale por el este.']],
    cayucos: [['immigrants', 'Ver las imágenes de los cayucos me rompe por dentro. Hace años, ese era yo.'],
      ['trinchera', 'Canarias, desbordada. ¿Dónde está el Gobierno?']],
    recordTourism: [['tourismWorkers', 'Récord de turistas. Récord de horas extra. Récord de dolor de pies. Récord de todo.'],
      ['tenants', 'Récord de turistas. Ahora entiendo por qué no hay un solo piso libre en todo el barrio.']],
    tractors: [['farmers', 'Ya estamos en la carretera. 400 tractores, 2.000 agricultores y una sola petición: que nos dejen vivir de nuestro trabajo. 🚜'],
      ['cunado', 'Atasco de 40 minutos por los tractores. Yo los apoyo, ¿eh? Pero que se manifiesten un domingo.']],
    blackout: [['abuela', 'Se ha ido la luz en toda España y he sido la única de la familia que sabía dónde estaban las velas. Respeto, por favor.'],
      ['youth', 'Sin luz y sin internet. He hablado con mi familia en la cena. Son majos. Quién lo iba a decir.']],
    referendum: [['catalanNat', 'Votarem. Pase lo que pase. 🗳️'], ['patriots', 'Un referéndum ilegal y el Gobierno mirando. Esto no se puede consentir.']],
    euFunds: [['economista', 'Llega otro tramo de fondos europeos. Hilo sobre en qué se gastaron los anteriores 🧵 (lo tengo a medias, todavía lo estoy buscando)'],
      ['nocturno', 'Bruselas pregunta a España qué ha hecho con los fondos y España responde «un poquito de todo».']],
    royalScandal: [['secular', 'Otro escándalo en la Casa Real. ¿Alguien más quiere preguntar por qué la pagamos entre todos?'],
      ['nocturno', 'La Casa Real anuncia «máxima transparencia» y publica una foto de una ventana.']],
    housingProtest: [['tenants', 'Hoy hemos salido miles. Pancarta en mano y con el alquiler pendiente de pagar. #ViviendaDigna'],
      ['wealthy', 'Manifestaciones por la vivienda. Que se compren una, como hicimos todos. Ah, que no pueden. Bueno.']],
    football: [['patriots', '¡¡¡CAMPEONES!!! ¡¡¡VIVA ESPAÑA!!! 🇪🇸🏆'], ['catalanNat', 'Hoy hasta mi tío de Vic ha celebrado un gol de la selección. No se lo digáis a nadie.'],
      ['nocturno', 'El presidente aprovecha la victoria de la selección para colar tres decretos «ahora que nadie está mirando».']],
    oilShock: [['selfEmployed', 'Llenar el depósito de la furgoneta ya cuesta lo mismo que un fin de semana en la playa. Y sin playa.'],
      ['economista', 'El petróleo se dispara. Hilo de lo que viene ahora en la inflación 🧵 (spoiler: nada bueno)']],
    ecbHike: [['youth', 'El BCE sube los tipos. Mi hipoteca no lo sabe porque no tengo hipoteca. Ni la tendré, al ritmo que vamos.'],
      ['parents', 'Subida de tipos. La cuota de la hipoteca ha subido más que la nota media de mis hijos.']],
    whiteTide: [['nurse', 'Hoy no estamos en la planta, estamos en la calle. Por nuestros pacientes. #MareaBlanca'],
      ['teacher', 'Profes y médicos juntos en la calle. Somos los que sostenemos esto. Que no se les olvide.']],
    techHub: [['youth', 'Una gran tecnológica se viene a España. A ver si así dejo de mandar currículums a Ámsterdam.'],
      ['economista', 'Llega una gran tecnológica. Hilo de qué significa para la productividad 🧵 (es bueno, os lo adelanto)']],
    bailout: [['economista', 'Los mercados nos cierran el grifo. Ya sabéis lo que toca: hilo largo y café cargado 🧵'],
      ['pensioners', 'Ya vivimos esto una vez. Ruego a Dios que esta vez no nos toque pagarlo a los de siempre.']],
    pensionReform: [['pensioners', 'Bruselas pide tocar las pensiones. Que vengan a mi barrio a decírmelo a la cara.']],
    ceutaJump: [['trinchera', 'Ceuta, en tensión tras un salto masivo a la valla.'], ['immigrants', 'Detrás de cada salto hay una historia. La mía empezó así. No lo olvidéis.']],
    narco: [['trinchera', 'Las narcolanchas campan a sus anchas. La Guardia Civil, con medios de hace veinte años.'],
      ['patriots', 'Todo mi apoyo a la Guardia Civil. Se juegan la vida contra los narcos con lo puesto.']],
    waterCuts: [['abuela', 'Cortes de agua. He llenado la bañera, cuatro garrafas y la olla de la paella. Por si acaso.'],
      ['meteo', 'Seguimos sin lluvias significativas en el horizonte. Lo siento. No es culpa mía, de verdad.']],
    erCollapse: [['nurse', 'Doce horas de turno. Pacientes en los pasillos. Compañeras llorando en el baño. Esto no es una crisis, es lo normal ya.'],
      ['doctor', 'Urgencias colapsadas. Si no es una urgencia de verdad, id a vuestro centro de salud. Ah, que tampoco hay cita. Ya.']],
    pensionerMarch: [['pensioners', 'Hoy estamos en la calle. Con bastón, con andador y con la cabeza muy alta. #MareaPensionista'],
      ['youth', 'Mi abuela en la manifestación con una pancarta más grande que ella. Icono absoluto.']],
    capitalFlight: [['wealthy', 'Ya está, me voy. Os mandaré postales desde Lisboa.'], ['altavoz', 'Las grandes fortunas amenazan con irse. Que se vayan, pero que paguen lo que deben antes de cerrar la puerta.']],
    taxEvasion: [['lowIncome', 'Yo declaro hasta el último euro y ellos con cuentas en paraísos fiscales. Qué país.'],
      ['nocturno', 'Un ciudadano de Albacete descubre que no tiene ninguna cuenta en un paraíso fiscal y se siente fuera de lugar.']],
    heatDeath: [['meteo', 'Por favor, cuidad a los mayores. Llamad a vuestros abuelos hoy. El calor mata.'],
      ['pensioners', 'Este verano no he salido de casa en tres semanas. El ventilador y yo ya somos familia.']],
  };

  // ── Situaciones ────────────────────────────────────────────
  const SITS = {
    housingCrisis: {
      on: [['tenants', 'Ya es oficial: emergencia habitacional. Yo lo sabía desde que mi piso compartido empezó a tener lista de espera.']],
      during: [['youth', 'He ido a ver una habitación: 600 euros, sin ventana, «con mucho encanto». El encanto era una planta de plástico.'],
        ['nocturno', 'Un joven de Madrid consigue alquilar un piso y la comunidad científica pide estudiar su caso.']],
      off: [['tenants', 'Dicen que ha pasado lo peor de la crisis de la vivienda. Mi alquiler no se ha enterado, pero me alegro por el titular.']],
    },
    drought: {
      on: [['farmers', 'Sequía extrema declarada. Mis olivos tienen más sed que yo después de una boda.']],
      during: [['meteo', '¿Lluvia? Os la debo. Seguimos sin nada en el horizonte. Lo siento mucho.'], ['rural', 'En el pueblo ya rezamos a San Isidro tres veces al día. Ayer lo hicimos en directo.']],
      off: [['farmers', 'Ha llovido. ¡HA LLOVIDO! He salido al campo a mojarme como un crío.']],
    },
    recession: {
      on: [['economista', 'Ya es oficial: recesión. Hilo con todo lo que tenéis que saber 🧵 (y lo que no queréis saber también)']],
      during: [['selfEmployed', 'Recesión. En el bar, los clientes piden un café y una tapa entre dos. Se nota.'], ['cunado', 'Esta crisis la arreglaba yo con dos medidas. No digo cuáles, que me las copian.']],
      off: [['economista', 'Salimos de la recesión. No lo celebréis aún, que os conozco. Pero hoy es buen día.']],
    },
    boom: {
      on: [['economista', 'La economía va como un tiro. Gráfico del día: todo para arriba. Disfrutadlo, que no siempre es así.']],
      during: [['wealthy', 'Buenos tiempos. Lo digo bajito por si Hacienda me oye.'], ['cunado', 'Todo va bien gracias a mí, que me compré una tele nueva y reactivé el consumo.']],
      off: [['economista', 'Se acabó la bonanza. Lo bueno, si breve… ya sabéis.']],
    },
    massUnemployment: {
      on: [['youth', 'Nos llaman «generación perdida». Perdida estará la generación de los que nos han traído hasta aquí.']],
      during: [['unemployed', 'En la cola del paro he coincidido con dos compañeros de la universidad. Hemos hecho una quedada de antiguos alumnos.']],
      off: [['youth', 'Ya no somos «generación perdida», según la prensa. Me alegro. Yo sigo buscando las llaves de mi futuro, pero me alegro.']],
    },
    fullEmployment: {
      on: [['economista', 'Pleno empleo. Hasta hace poco lo habría puesto entre comillas. Hoy no.']],
      during: [['selfEmployed', 'Busco camarero y no encuentro. Nunca pensé que lo diría.']],
      off: [['unemployed', 'Se acabó el pleno empleo. Justo cuando yo iba a encontrar trabajo.']],
    },
    independenceCrisis: {
      on: [['catalanNat', 'Hem arribat fins aquí. No farem ni un pas enrere.'], ['patriots', 'España no se rompe. Por mucho que lo intenten.']],
      during: [['nocturno', 'Una familia de Lleida tiene que celebrar dos cenas de Navidad para no hablar de política.']],
      off: [['catalanNat', 'La crisis se ha calmado. El conflicto, no. Pero al menos hoy podemos cenar en paz.']],
    },
    debtCrisis: {
      on: [['economista', 'La prima de riesgo se dispara. Mi gráfico ya no cabe en la pantalla. Hilo 🧵']],
      during: [['pensioners', 'Crisis de deuda. Ya la vivimos y la pagamos nosotros. Que no vuelva a pasar.']],
      off: [['economista', 'La prima de riesgo baja por fin. Hoy duermo ocho horas por primera vez en meses.']],
    },
    excessiveDeficit: {
      on: [['economista', 'Bruselas abre expediente por déficit excesivo. Hilo con las cuentas 🧵 (están feas)']],
      during: [['cunado', 'El Gobierno gasta más de lo que ingresa. Como yo en las rebajas, pero con nuestro dinero.']],
      off: [['economista', 'Fuera del expediente por déficit. Las cuentas respiran. Yo también.']],
    },
    overtourism: {
      on: [['tenants', 'Turismofobia, lo llaman. Yo lo llamo querer vivir en mi barrio sin pedir permiso a una maleta.']],
      during: [['tourismWorkers', 'Los vecinos protestan contra los turistas y yo los sirvo a todos. Me siento en mitad de un divorcio.']],
      off: [['tourismWorkers', 'Se ha calmado lo de la turismofobia. Ya puedo volver a recomendar mi bar sin miedo.']],
    },
    energyCrisis: {
      on: [['lowIncome', 'Crisis energética. La factura de la luz ya es mi pesadilla más recurrente.']],
      during: [['abuela', 'Pongo la lavadora a las tres de la mañana como si fuera una operación secreta. Todo por la luz.']],
      off: [['lowIncome', 'La factura de la luz ha bajado. He encendido la lámpara del salón solo para celebrarlo.']],
    },
    crimeWave: {
      on: [['trinchera', 'Ola de inseguridad: los vecinos tienen miedo.']],
      during: [['parents', 'Ya no dejo que mi hija vuelva sola a casa. No sé si exagero, pero prefiero exagerar.']],
      off: [['cunado', 'Ha bajado la inseguridad. Yo ya podía ir tranquilo por la calle, pero ahora también por la noche.']],
    },
    demographicWinter: {
      on: [['nocturno', 'El INE confirma que en España nacen más perros de raza que niños. Los perros no han querido hacer declaraciones.']],
      during: [['parents', '¿Por qué no tenemos más hijos? Mira mi nómina, mira mi alquiler y luego hablamos.']],
      off: [['parents', 'Sube la natalidad. En mi grupo de madres ya no cabemos en el parque.']],
    },
    innovationHub: {
      on: [['youth', 'España, polo tecnológico. Mis amigos que se fueron a Berlín ya están mirando vuelos de vuelta.']],
      during: [['economista', 'Gráfico del día: inversión en tecnología. Por fin un gráfico que da alegrías.']],
      off: [['youth', 'Se acabó el polo tecnológico. Voy desempolvando el alemán.']],
    },
    corruptionCulture: {
      on: [['nocturno', 'España crea el Ministerio de Corrupción para gestionarla de forma más eficiente.']],
      during: [['cunado', 'Todos los políticos son iguales. Menos el mío, que es peor.']],
      off: [['secular', 'Baja la corrupción. Igual resulta que las instituciones funcionan cuando se les deja.']],
    },
  };

  // ── Indicadores que se mueven ──────────────────────────────
  const SIMS = {
    unemployment: { up: [['unemployed', 'Sube el paro. Ya me conocen en la oficina de empleo por mi nombre de pila.']], down: [['workers', 'Baja el paro. En la fábrica han entrado cinco chavales nuevos. Se nota el ambiente.']] },
    inflation: { up: [['lowIncome', 'He ido al súper con 50 euros y he vuelto con una bolsa. Una. Y no pesaba.'], ['abuela', 'Una docena de huevos al precio que estaba antes la docena de jamón. Lo que me queda por ver.']],
      down: [['parents', 'El carro de la compra me ha salido un poco más barato. No mucho, pero lo he notado. ¿Estoy soñando?']] },
    housing: { up: [['tenants', 'Mi casero me sube el alquiler «por el mercado». El mercado, ese señor que nadie conoce y que siempre sale ganando.']],
      down: [['youth', 'Dicen que baja el precio de la vivienda. Voy a mirar pisos. Vuelvo en cinco minutos llorando.']] },
    energy: { up: [['lowIncome', 'La factura de la luz de este mes la he leído sentada. Y aun así me he mareado.']], down: [['abuela', 'Baja la luz. Ya puedo poner la tele y la estufa a la vez, como una reina.']] },
    growth: { up: [['economista', 'La economía crece. Gráfico del día: flechita para arriba. No os acostumbréis.']], down: [['selfEmployed', 'Se nota el frenazo. Clientes que antes pedían, ahora preguntan. Y luego se van.']] },
    crime: { up: [['parents', 'Han entrado a robar en dos pisos de mi bloque esta semana. Estamos todos con el miedo en el cuerpo.']], down: [['cunado', 'Baja la criminalidad. Ya puedo dejar la bici sin cadena. Mentira, no.']] },
    health: { up: [['doctor', 'Por fin hay más compañeros en el centro de salud. Ya puedo dedicar más de cinco minutos a cada paciente. Lujo.']],
      down: [['pensioners', 'He pedido cita con el médico de cabecera y me la han dado para dentro de tres semanas. Ojalá me dure el catarro.']] },
    water: { up: [['farmers', 'Los pantanos, a mínimos. Mis olivos y yo miramos al cielo cada mañana.']], down: [['rural', 'Por fin llueve en el pueblo. Las abuelas han salido a la puerta a verlo como si fuera un desfile.']] },
    riskPremium: { up: [['economista', 'Sube la prima de riesgo. No os asustéis. Bueno, un poquito sí. Hilo 🧵']] },
    realWage: { up: [['workers', 'Este año el sueldo me cunde más. No es para tirar cohetes, pero tampoco para tirarme de los pelos.']],
      down: [['workers', 'Me han subido el sueldo y aun así cada mes llego peor. Explícamelo como si tuviera cinco años.']] },
    tourism: { up: [['tourismWorkers', 'Este verano los turistas no caben ni en la playa ni en mi terraza. Yo tampoco quepo en mis zapatillas, de tanto andar.']] },
    corruption: { up: [['cunado', 'Otro caso de corrupción. Ya ni me sorprendo. Ni me indigno. Bueno, un poco sí.']] },
    tension: { up: [['nocturno', 'Una pareja mixta Madrid-Barcelona decide no hablar de política hasta nuevo aviso. Llevan tres días sin hablar.']] },
    birthrate: { up: [['parents', 'En mi barrio vuelven a verse carritos. Algo está pasando.']] },
  };

  // ── Tendencias de fondo, en palabras de la calle ────────────
  const TREND = {
    unemployment: { up: 'el paro no deja de subir', down: 'el paro baja' },
    inflation: { up: 'la cesta de la compra no para de subir', down: 'los precios por fin se moderan' },
    housing: { up: 'los alquileres siguen disparados', down: 'la vivienda empieza a ser algo más asequible' },
    energy: { up: 'la luz sigue por las nubes', down: 'la factura de la luz baja' },
    growth: { up: 'la economía crece', down: 'la economía se frena' },
    health: { up: 'la sanidad pública mejora', down: 'las listas de espera crecen' },
    education: { up: 'la educación pública mejora', down: 'la educación pública se deteriora' },
    crime: { up: 'la inseguridad crece en nuestras calles', down: 'la delincuencia baja' },
    poverty: { up: 'cada vez más familias no llegan a fin de mes', down: 'menos familias pasan apuros' },
    riskPremium: { up: 'la prima de riesgo se dispara', down: 'la prima de riesgo se calma' },
    depopulation: { up: 'los pueblos se siguen vaciando', down: 'los pueblos recuperan vecinos' },
    precarity: { up: 'la precariedad no para de crecer', down: 'hay más contratos estables' },
    corruption: { up: 'la corrupción vuelve a las portadas', down: 'hay menos casos de corrupción' },
    realWage: { up: 'los sueldos cunden más', down: 'los sueldos cunden cada vez menos' },
  };
  const OPP_JAB = {
    UC: ['Mientras {pres} se hace fotos, {what}. España necesita un cambio de rumbo, y lo necesita ya.',
      'Datos, no propaganda: {what}. El Gobierno de {pres} se ha quedado sin excusas.'],
    VP: ['{what} y el Gobierno, de fiesta en fiesta. Los españoles de bien ya no pueden más. 🇪🇸',
      'Ni una palabra del Gobierno sobre lo único que importa: {what}. Vergüenza.'],
    IP: ['{what} y la gente lo está pasando mal. Este Gobierno tenía que ser otra cosa.',
      'Mientras {what}, en la Moncloa se felicitan entre ellos. Bajad a la calle un rato.'],
    any: ['{what}. Esa es la única realidad que no sale en los anuncios del Gobierno.',
      'Recordatorio para {pres}: {what}. De nada.'],
  };
  const OWN_BRAG = ['Buenas noticias: {what}. Detrás hay trabajo, no casualidad. #{party}Cumple',
    '{what}. Sin hacer ruido. Seguimos.', 'Hay quien prefiere no verlo, pero {what}. Y esto no ha hecho más que empezar.'];
  const OPP_DISMISS = ['Que {what} no es mérito de {pres}. Es a pesar de {pres}.', 'Dicen que {what}. Que se lo cuenten a quien no llega a fin de mes.',
    'Mucho presumir de que {what}. Ya veremos cuánto dura.'];
  const LEADER_POSTS = ['Hoy he estado en {region}. Gracias por el cariño y también por las críticas: de las dos se aprende. 🙏',
    'Reunión larga, café frío y buenas ideas. Seguimos trabajando para la mayoría. 💪',
    'Gobernar es escuchar. Hoy, a primera hora, con alcaldes de {region}. Toca ponerse las pilas.',
    'Mi abuela decía: «el que algo quiere, algo le cuesta». Hoy ha costado, pero lo estamos logrando.',
    'Pequeña pausa en la agenda para ver el partido. Luego, a seguir. ⚽'];

  // ── Ambiente: lo que se publica cuando no pasa nada ─────────
  const AMBIENT = [
    ['cunado', 'Yo este país lo arreglaba en dos tardes. Pero claro, no me dejan.'],
    ['cunado', 'Lo que yo te diga: esto lo veremos. Y cuando lo veamos, me acordaré de que lo dije.'],
    ['abuela', 'Mi nieta me ha enseñado a poner emojis. 👍👍👍 Ahora no sé quitarlos. 👍'],
    ['nocturno', 'Un hombre de Teruel consigue explicar el sistema D\'Hondt en una cena familiar y desaparece en una nube de luz.'],
    ['nocturno', 'El Senado se reúne para debatir si alguien sabe para qué sirve el Senado. No hay quórum.'],
    ['nocturno', 'Un estudio confirma que el 100 % de los españoles sabe exactamente lo que haría si fuera presidente del Gobierno.'],
    ['economista', 'Gráfico del día: la deuda pública. Lo pongo en fondo negro para que no se note tanto.'],
    ['teacher', 'Hoy he preguntado en clase quién es el presidente del Gobierno. Un alumno ha dicho «el de los memes». Técnicamente correcto.'],
    ['student', '¿Entra en el examen quién gobierna? Porque cambia mucho y no me da tiempo.'],
    ['boletin', '🤖 Hoy el Boletín Oficial tiene 412 páginas. Os ahorro la lectura: no hay nada sobre vosotros. O sí. No lo sé, soy un bot.'],
  ];
  const WEATHER = {
    1: ['❄️ Semana de frío en la meseta. Abrigaos y no dejéis el coche a la intemperie sin mirar el parabrisas.', '🌧️ Llega un frente por el oeste. Galicia, ya lo sabíais. El resto, paraguas.'],
    2: ['🌸 Primavera en toda España. Alérgicos, mi más sentido pésame.', '🌦️ Semana de tiempo loco: sol, lluvia y granizo, a veces en el mismo día. Lo normal en abril.'],
    3: ['☀️ Calor en el interior. Si podéis, la siesta es una medida de salud pública.', '🌡️ Noches tropicales en la costa. El ventilador es vuestro mejor amigo.'],
    4: ['🍂 Otoño de verdad. Sacad las chaquetas, que ya toca.', '🌧️ Vuelven las lluvias. Los pantanos lo agradecen; vuestros zapatos, no tanto.'],
  };

  // ── Rellenar plantillas ─────────────────────────────────────
  function fill(t, ctx) {
    return t.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] != null ? ctx[k] : m));
  }
  // Etiquetas con tildes, como se escriben de verdad; las cuentas (@), sin ellas
  function tagOf(s, plain) {
    const base = plain ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
    return base.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]/g, '').split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  }
  // «Control del alquiler» → «control del alquiler», sin la sigla entre paréntesis
  function polName(n) {
    const x = n.replace(/\s*\([^)]*\)/g, '');
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x;
  }
  function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  const PALETTE = ['#c0392b', '#2471a3', '#1e8449', '#b9770e', '#7d3c98', '#117a65', '#a04000', '#2e4053', '#922b21', '#1f618d'];

  function author(who, r) {
    if (MEDIA[who]) return Object.assign({ id: who, kind: MEDIA[who].bot ? 'bot' : 'media', verified: !!MEDIA[who].media }, MEDIA[who]);
    if (EXTRAS[who]) return Object.assign({ id: who, kind: 'citizen' }, EXTRAS[who]);
    if (CAST[who]) { const c = pick(r, CAST[who]); return Object.assign({ id: c.handle, kind: 'citizen', group: who }, c); }
    return null;
  }

  function generate(st, S, M, report, opts = {}) {
    report = report || {};
    const r = mulberry32((st.rngState || 1) ^ (st.turn * 2654435761));
    const posts = [];
    // Lo publicado hace poco no se repite
    const used = new Set((st.social || []).filter((p) => p.turn >= st.turn - 6).map((p) => p.text.slice(0, 40)));
    const authors = new Set();
    const pres = st.player.leader && st.player.leader !== 'El presidente' ? st.player.leader : 'el presidente';
    const presS = st.player.leader && st.player.leader !== 'El presidente' ? st.player.leader.split(' ').slice(-1)[0] : 'presidente';
    const presTag = tagOf(st.player.leader && st.player.leader !== 'El presidente' ? st.player.leader : 'Presidente', true);
    const base = { pres, presS, party: st.player.short, partyName: st.player.name };
    const shares = st.lastVote ? st.lastVote.shares : {};
    const partyIds = S.parties.map((p) => p.id);
    const rivals = partyIds.filter((id) => POLS[id]).sort((a, b) => (shares[b] || 0) - (shares[a] || 0));
    const mainOpp = rivals[0];
    const partyById = Object.fromEntries(S.parties.map((p) => [p.id, p]));
    const own = { id: 'own', name: st.player.name, handle: tagOf(st.player.short, true) + '_oficial', bio: 'Cuenta oficial.', kind: 'party', color: st.player.color, verified: true };
    const leaderAcc = { id: 'leader', name: st.player.leader && st.player.leader !== 'El presidente' ? st.player.leader : 'Presidencia del Gobierno', handle: presTag, bio: 'Presidente del Gobierno.', kind: 'party', color: st.player.color, verified: true };
    const polAcc = (pid) => Object.assign({ id: pid, kind: 'politician', verified: true, color: (partyById[pid] || {}).color, party: (partyById[pid] || {}).short }, POLS[pid]);

    function add(a, text, prio, extra) {
      if (!a || !text) return null;
      // Las partidas de 2006 o 2012 no hablan de audios ni de memes
      if (st.year < 2014 && /audio|emoji|meme|videollamada/i.test(text)) return null;
      // «de el presidente» → «del presidente» cuando el jugador no tiene nombre
      text = text.replace(/\bde el /g, 'del ').replace(/\ba el /g, 'al ');
      text = text.charAt(0).toUpperCase() + text.slice(1);
      const key = text.slice(0, 40);
      // Una voz por trimestre: el timeline se lee mejor con muchas caras
      if (used.has(key) || authors.has(a.handle)) return null;
      used.add(key); authors.add(a.handle);
      const p = Object.assign({ a, text, prio: prio + r() * 0.5 }, extra || {});
      posts.push(p);
      return p;
    }
    const say = (who, text, prio, ctx, extra) => add(author(who, r), fill(text, Object.assign({}, base, ctx || {})), prio, extra);

    // 1. Cambios de política del trimestre
    const changes = (st.lastChanges || []).slice(0, 4);
    if (changes.length && !opts.opening) {
      const lines = changes.map((c) => {
        const p = M.policyById[c.id];
        return c.to.active ? `· ${p.name}: «${E().levelLabel(p, c.to.v)}»` : `· ${p.name}: derogada`;
      });
      say('boletin', `🤖 Publicado en el Boletín Oficial:\n${lines.join('\n')}`, 3, {}, { kind: 'bot' });
    }
    changes.slice(0, 3).forEach((c, i) => {
      const p = M.policyById[c.id];
      if (!p) return;
      const before = c.from.active ? c.from.v : 0, after = c.to.active ? c.to.v : 0;
      const dir = after - before;
      if (Math.abs(dir) < 0.01) return;
      const ctx = { pol: polName(p.name), lvl: c.to.active ? E().levelLabel(p, c.to.v) : 'derogada', verb: dir > 0 ? 'reforzar' : 'recortar' };
      const q = POLICY[p.id] && POLICY[p.id][dir > 0 ? 'up' : 'down'];
      if (q) q.slice(0, i === 0 ? 2 : 1).forEach(([who, t], k) => say(who, t, 9 - i - k * 0.5, ctx));
      // grupos que salen ganando y perdiendo
      const fx = (p._fx || []).filter((f) => S.groups[f.t] && !S.groups[f.t].hidden && CAST[f.t]).map((f) => ({ g: f.t, m: f.a * dir })).sort((x, y) => x.m - y.m);
      const loser = fx[0], winner = fx[fx.length - 1];
      if (loser && loser.m < -0.02) say(loser.g, pick(r, GEN_ANGRY), 6 - i, ctx);
      if (winner && winner.m > 0.02 && r() < 0.7) say(winner.g, pick(r, GEN_HAPPY), 5 - i, ctx);
      // la oposición
      const reacting = p.cat === 'territory'
        ? partyIds.filter((id) => PARTY_REGION[id] && POLS[id] && (shares[id] || 0) > 0.003).slice(0, 1).concat([mainOpp])
        : [mainOpp, rivals.find((id) => id !== mainOpp && PARTY_VOICE[id] && r() < 0.6)];
      reacting.filter(Boolean).forEach((pid) => {
        const party = partyById[pid];
        const tilt = (p.lr || 0) * dir;
        const agree = Math.abs(tilt) > 0.003 && Math.sign(tilt) === Math.sign(party.lr || 0);
        const voice = PARTY_VOICE[pid] || REGIONAL_VOICE;
        add(polAcc(pid), fill(pick(r, agree ? voice.yes : voice.no), Object.assign({}, base, ctx, { region: PARTY_REGION[pid] || 'nuestra tierra' })), 7 - i);
      });
      if (i === 0 && r() < 0.6) add(own, fill(pick(r, ['Cumplimos. {pol}: «{lvl}». Este Gobierno hace lo que dice. #{party}Cumple',
        'Lo de {pol} es una decisión pensada para la mayoría. Seguimos trabajando.',
        'Hoy hemos aprobado {pol}. Ni ruido ni excusas: hechos.']), Object.assign({}, base, ctx)), 4);
    });

    // 2. Sucesos del trimestre
    (report.events || []).forEach((e) => {
      (EVENTS[e.id] || []).slice(0, 2).forEach(([who, t], k) => say(who, t, 10 - k));
    });

    // 3. Situaciones
    (report.situations || []).forEach((s) => {
      const d = SITS[s.id];
      if (!d) return;
      (s.on ? d.on : d.off).forEach(([who, t]) => say(who, t, 9));
    });
    const newSits = new Set((report.situations || []).map((s) => s.id));
    const ongoing = S.situations.filter((s) => st.situations[s.id] && !newSits.has(s.id) && SITS[s.id]);
    ongoing.sort(() => r() - 0.5).slice(0, 2).forEach((s) => { if (r() < 0.7) { const [who, t] = pick(r, SITS[s.id].during); say(who, t, 5); } });

    // 4. Indicadores que se han movido de verdad
    const moves = Object.keys(SIMS).map((id) => {
      const h = (st.history.sims || {})[id] || [];
      const d = h.length > 1 ? h[h.length - 1] - h[h.length - 2] : 0;
      return { id, d };
    }).filter((x) => Math.abs(x.d) > 0.012).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2);
    moves.forEach((m) => {
      const list = SIMS[m.id][m.d > 0 ? 'up' : 'down'];
      if (list) { const [who, t] = pick(r, list); say(who, t, 6); }
    });

    // 4b. Cómo va el año: la oposición señala lo que empeora, el Gobierno presume de lo que mejora
    const trend = Object.keys(TREND).map((id) => {
      const s = S.sims[id], h = (st.history.sims || {})[id] || [];
      if (!s || !s.good || h.length < 2) return null;
      const d = h[h.length - 1] - h[Math.max(0, h.length - 5)];
      if (Math.abs(d) < 0.01) return null;
      const dirKey = d > 0 ? 'up' : 'down';
      const better = s.good === 'high' ? d > 0 : d < 0;
      return TREND[id][dirKey] ? { id, d, better, phrase: TREND[id][dirKey] } : null;
    }).filter(Boolean).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const worse = trend.filter((x) => !x.better), better = trend.filter((x) => x.better);
    if (worse.length && mainOpp) {
      const x = worse[0];
      add(polAcc(mainOpp), fill(pick(r, OPP_JAB[mainOpp] || OPP_JAB.any), Object.assign({}, base, { what: x.phrase })), 5);
    }
    if (better.length && !opts.opening && !st.gameOver) {
      const x = better[0];
      add(own, fill(pick(r, OWN_BRAG), Object.assign({}, base, { what: x.phrase })), 4);
      if (mainOpp && r() < 0.5) add(polAcc(rivals[1] || mainOpp), fill(pick(r, OPP_DISMISS), Object.assign({}, base, { what: x.phrase })), 3.5);
    }

    // 4c. Los titulares del trimestre, contados por los medios
    st.news.filter((n) => n.turn === st.turn && n.kind !== 'policy').slice(0, 2).forEach((n, i) => {
      const outlet = n.kind === 'bad' ? pick(r, ['trinchera', 'cronica', 'diario']) : n.kind === 'good' ? pick(r, ['altavoz', 'diario']) : pick(r, ['diario', 'cronica']);
      const lead = outlet === 'cronica' ? pick(r, ['😱 ', '🔴 ', '']) : outlet === 'trinchera' ? '🚨 ' : '';
      const head = outlet === 'cronica' ? pick(r, ['{t}. Lo que nadie te está contando 👇', '{t}: todo lo que tienes que saber', '{t}. Y esto es solo el principio']) : outlet === 'trinchera' ? '{t}' : 'ÚLTIMA HORA | {t}';
      add(author(outlet, r), lead + fill(head, { t: n.title }), 6 - i);
    });

    // 4d. El presidente también publica
    if (!opts.opening && !st.gameOver && r() < 0.55) {
      const regs = Object.values(S.regions || {}).map((x) => x.name);
      add(leaderAcc, fill(pick(r, LEADER_POSTS), Object.assign({}, base, { region: regs.length ? pick(r, regs) : 'España' })), 3.8);
    }

    // 5. Ánimo de los grupos
    const gs = st.lastVote ? st.lastVote.groupStats : {};
    const groups = Object.keys(MOOD).filter((g) => S.groups[g] && gs[g] && gs[g].size > 0.015).map((g) => ({ g, h: st.groupHappy[g] }));
    groups.sort((a, b) => a.h - b.h);
    const angry = groups.filter((x) => x.h < 0.45), happy = groups.filter((x) => x.h > 0.55).reverse();
    angry.slice(0, 4).sort(() => r() - 0.5).slice(0, 2).forEach((x) => say(x.g, pick(r, MOOD[x.g].angry), 4));
    if (happy.length) { const x = pick(r, happy.slice(0, 3)); say(x.g, pick(r, MOOD[x.g].happy), 4); }

    // 5b. Sucesos que siguen dando que hablar
    const fresh = new Set((report.events || []).map((e) => e.id));
    (window.Engine.activeEvents(st, S) || []).filter((e) => !fresh.has(e.id) && EVENTS[e.id]).slice(0, 1).forEach((e) => {
      const [who, t] = pick(r, EVENTS[e.id]);
      say(who, t, 3);
    });

    // 6. Encuestas
    const P = st.history.polls || [];
    if (P.length && (r() < 0.6 || opts.opening)) {
      const last = P[P.length - 1].shares, prev = P.length > 1 ? P[P.length - 2].shares : last;
      const top = Object.keys(last).sort((a, b) => last[b] - last[a]).slice(0, 4);
      const nm = (id) => (id === 'player' ? st.player.short : (partyById[id] || {}).short || id);
      const arrow = (id) => { const d = last[id] - (prev[id] || 0); return Math.abs(d) < 0.002 ? '=' : d > 0 ? '▲' : '▼'; };
      say('sondeos', `📊 Estimación de voto\n${top.map((id) => `${nm(id)} ${fmtPct(last[id])} ${arrow(id)}`).join('\n')}`, 3);
      const dp = last.player - (prev.player || last.player);
      if (dp < -0.012 && mainOpp) add(polAcc(mainOpp), fill(pick(r, ['Las encuestas lo dicen claro: España ha dicho basta a {pres}. Nosotros, preparados.', 'Cada encuesta, un poco peor para el Gobierno. Que vayan haciendo las maletas.']), base), 5);
      if (dp > 0.012 && !st.gameOver) add(own, fill(pick(r, ['Las encuestas confirman lo que vemos en la calle: la gente confía en {party}. Gracias. A seguir.', 'Sube {party} en las encuestas. La única encuesta que importa es la de las urnas, pero esta también nos gusta. 😉']), base), 4);
    }

    // 7. Elecciones
    const L = st.lastElection;
    if (report.election && L) {
      if (L.outcome === 'won') {
        add(leaderAcc, fill(pick(r, ['Gracias, España. Hoy no gana un partido, gana un proyecto de país. Mañana, a trabajar. 🙏', 'Gracias a todos los que habéis votado, también a los que no nos votasteis. Gobernaré para todos.']), base), 12);
        if (mainOpp) add(polAcc(mainOpp), fill('Felicito a {pres} por el resultado. Desde la oposición, estaremos vigilantes. Cada día.', base), 11);
        say('nocturno', '{pres} gana las elecciones y anuncia que lo primero que hará será dormir catorce horas seguidas.', 10);
        say('cunado', 'Ha ganado quien yo dije. Bueno, yo dije otra cosa, pero se me entendió.', 8);
      } else if (L.outcome === 'hung') {
        say('nocturno', 'Los españoles, convocados de nuevo a las urnas, piden que al menos esta vez den croquetas en los colegios electorales.', 12);
        say('abuela', 'Otra vez a votar. En mi colegio electoral ya me conocen por el nombre. Me guardan sitio.', 10);
        say('economista', 'Repetición electoral. Hilo sobre lo que cuesta celebrar unas elecciones 🧵 (mucho)', 8);
      } else if (L.outcome === 'lost') {
        if (mainOpp) add(polAcc(mainOpp), 'Hoy empieza un tiempo nuevo para España. Gracias a todos. Ahora, a trabajar.', 12);
        say('nocturno', 'La Moncloa busca piso de alquiler: «Si alguien sabe de algo a precio razonable, que avise». No hay respuestas.', 11);
        add(leaderAcc, 'Ha sido un honor servir a mi país. Gracias a todos los que lo habéis hecho posible.', 10);
      }
    } else if (report.campaign) {
      say('nocturno', 'Comienza la campaña: los candidatos descubren de repente que existen los mercados, las ferias y los bebés para cogerlos en brazos.', 9);
      say('cunado', 'Ya huele a campaña. Hoy han asfaltado mi calle por primera vez en diez años.', 7);
    }

    // 8. Promesas cumplidas o rotas este trimestre
    (st.promises || []).filter((p) => p.settledTurn === st.turn).forEach((p) => {
      const ctx = { title: p.title.charAt(0).toLowerCase() + p.title.slice(1) };
      if (p.status === 'broken') {
        say(pick(r, ['cunado', 'youth', 'pensioners', 'lowIncome']), '{pres} prometió «{title}». Lo dejo aquí, sin más. 👀', 9, ctx);
        if (mainOpp) add(polAcc(mainOpp), fill('Otra promesa incumplida: «{title}». La palabra de {pres} vale lo que vale.', Object.assign({}, base, ctx)), 8);
      } else if (p.status === 'kept') {
        add(own, fill('Prometimos «{title}». Hecho. ✅', Object.assign({}, base, ctx)), 8);
        say('cunado', 'Han cumplido lo de «{title}». Algo tramarán.', 6, ctx);
      }
    });

    // 9. Aprobación, desgaste y la víspera de las elecciones
    const appr = st.lastVote ? st.lastVote.approval : 0.5;
    if (appr < 0.33 && r() < 0.5) say('nocturno', '{pres} pide a los españoles que dejen de buscar su nombre junto a la palabra «dimisión»: «Me baja la autoestima».', 5);
    if (appr > 0.55 && r() < 0.5) say('abuela', 'En la comida del domingo hasta mi yerno ha hablado bien de {pres}. Apuntad la fecha.', 5);
    const years = Math.floor(st.turn / 4);
    if (years >= 3 && r() < 0.25) say('parents', 'Mi hijo tiene {n} años y no recuerda otro presidente que {pres}. Le he dicho que antes había otros. No me cree.', 3, { n: years + 2 });
    const left = st.nextElectionTurn - st.turn;
    if (left > 0 && left <= 2 && !report.campaign && r() < 0.6) say('cunado', 'Se acercan las elecciones: inauguran una rotonda al día. Mi pueblo ya tiene tres.', 4);

    // 10. Arranque de la partida
    if (opts.opening) {
      add(leaderAcc, fill('Hoy asumo la Presidencia del Gobierno con humildad y con ganas. Gobernaré para todos. Empezamos. 🇪🇸', base), 12);
      if (mainOpp) add(polAcc(mainOpp), fill('Le deseamos suerte a {pres}. La va a necesitar. Nosotros haremos una oposición firme, cada día.', base), 11);
      say('nocturno', '{pres} llega a La Moncloa y lo primero que pregunta es la contraseña del wifi.', 10);
      say('cunado', 'Le doy seis meses. Bueno, un año. Bueno, ya veremos.', 8);
    }

    // 11. Relleno: el tiempo y alguna tontería
    if (r() < 0.55) say('meteo', pick(r, WEATHER[st.quarter] || WEATHER[1]), 1);
    const amb = AMBIENT.filter(([, t]) => !used.has(t.slice(0, 40)));
    if (amb.length) { const [who, t] = pick(r, amb); say(who, t, 1); }

    // Orden y números
    posts.sort((a, b) => b.prio - a.prio);
    const out = posts.slice(0, opts.max || 12);
    const AGO = ['2 min', '8 min', '25 min', '1 h', '2 h', '3 h', '5 h', '7 h', '11 h', '1 d', '2 d'];
    out.forEach((p, i) => {
      const k = p.a.kind;
      const reach = k === 'politician' || k === 'party' ? 4000 : k === 'media' ? 1800 : k === 'bot' ? 60 : 250;
      const viral = r() < 0.12 ? 8 + r() * 30 : 1;
      p.likes = Math.round(reach * (0.3 + r() * 1.6) * viral);
      p.reposts = Math.round(p.likes * (0.08 + r() * 0.25));
      p.replies = Math.round(p.likes * (0.02 + r() * (k === 'politician' ? 0.4 : 0.1)));
      p.ago = AGO[Math.min(AGO.length - 1, i + Math.floor(r() * 2))];
      p.turn = st.turn; p.year = st.year; p.quarter = st.quarter;
      if (!p.a.color) p.a.color = PALETTE[hashCode(p.a.handle) % PALETTE.length];
      delete p.prio;
    });
    // De vez en cuando, alguien contesta a un político
    const target = out.find((p) => p.a.kind === 'politician' || p.a.kind === 'party');
    if (target && r() < 0.65) {
      const pool = ['cunado', 'abuela', 'youth', 'secular', 'patriots', 'lowIncome'].filter((w) => !authors.has((EXTRAS[w] || {}).handle));
      const replier = author(pick(r, pool), r);
      replier.color = PALETTE[hashCode(replier.handle) % PALETTE.length];
      target.reply = { a: replier, text: pick(r, ['Ratio.', 'Esto lo has escrito tú o el becario?', 'Captura hecha, por si lo borras. 📸', 'Muy bonito todo. ¿Y lo mío de la ventanilla, para cuándo?', 'Guárdate este tuit para dentro de un año.', 'Jajajaja. Ah, que no era broma.']) };
    }
    return out;
  }

  // Tendencias: etiquetas a partir de lo que está pasando
  function trends(st, S, M) {
    const t = [];
    const presTag = tagOf(st.player.leader && st.player.leader !== 'El presidente' ? st.player.leader : 'Presidente');
    S.situations.filter((s) => st.situations[s.id]).forEach((s) => t.push({ tag: '#' + tagOf(s.name), note: s.bad ? 'Crisis' : 'Tendencia' }));
    (window.Engine.activeEvents(st, S) || []).slice(0, 3).forEach((e) => t.push({ tag: '#' + tagOf(e.title), note: 'Suceso' }));
    (st.lastChanges || []).slice(0, 3).forEach((c) => { const p = M.policyById[c.id]; if (p) t.push({ tag: '#' + tagOf(p.name.replace(/\(.*\)/, '')), note: 'Política' }); });
    const appr = st.lastVote ? st.lastVote.approval : 0.5;
    t.push(appr < 0.35 ? { tag: '#' + presTag + 'Dimisión', note: 'Política' } : { tag: '#' + presTag, note: 'Política' });
    const left = st.nextElectionTurn - st.turn;
    if (left <= 2) t.push({ tag: '#Elecciones' + (st.year + (left > 1 && st.quarter === 4 ? 1 : 0)), note: 'Política' });
    t.push({ tag: pick(mulberry32(st.turn + 7), ['#LunesDeCafé', '#ViernesPorFin', '#TerracitaYa', '#SiestaNacional', '#CroquetasDeLaAbuela']), note: 'Ocio' });
    const seen = new Set();
    return t.filter((x) => (seen.has(x.tag) ? false : seen.add(x.tag))).slice(0, 8);
  }

  const E = () => window.Engine;

  function update(st, S, M, report, opts) {
    const fresh = generate(st, S, M, report, opts);
    st.social = fresh.concat(st.social || []).slice(0, 140);
  }

  G.Social = { update, trends };
})(typeof window !== 'undefined' ? window : globalThis);
