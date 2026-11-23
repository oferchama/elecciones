# La Moncloa: un simulador político de España

**Juega en línea: [elecciones.regalitogames.com](https://elecciones.regalitogames.com)**

Un juego de estrategia por turnos en el que presides el Gobierno de España. Decides las políticas, cuadras las cuentas, mantienes contentos a los votantes y a tus socios, y te juegas el cargo en unas elecciones con el sistema electoral español.

## Cómo jugar

Abre `index.html` con doble clic: no hace falta instalar nada. Con conexión, también carga las fuentes de Google y el mapa por comunidades (límites del IGN a través de [es-atlas](https://github.com/martgnz/es-atlas)); sin conexión, todo lo demás funciona igual.

También puedes servirlo en local:

```bash
node serve.js
```

y abrir http://localhost:8080. La partida se guarda sola en el navegador.

## Qué incluye

- **84 políticas** en 8 áreas: fiscalidad, empleo, bienestar, servicios públicos, interior y defensa, modelo territorial, medio ambiente y vivienda.
- **26 indicadores** que se influyen entre sí con retraso (paro, coste de la vivienda, prima de riesgo, sequía, España vaciada, tensión territorial, natalidad…) y **15 situaciones** que se activan al cruzar umbrales. Encima actúan fuerzas que no controlas: la economía mundial, los tipos del BCE, el petróleo, la tensión geopolítica, la presión migratoria, la automatización, los fondos europeos, el cambio climático y el envejecimiento.
- **22 grupos de votantes** simulados con unos 7.500 electores en 52 provincias. Los grupos crecen y menguan con el país.
- **Elecciones como las reales**: D'Hondt en cada provincia, umbral del 3 %, 350 escaños, investidura, repetición electoral y moción de censura.
- **Campaña con promesas**: lo que prometes se convierte en el objetivo de tu mandato, y los votantes te castigan si no lo cumples.
- **Seis escenarios**: España hoy, mayoría absoluta, la burbuja de 2006, la Gran Recesión de 2012, el procés de 2017 y una España aleatoria. Puedes elegir la ideología y el modelo territorial de tu partido.
- **27 sucesos y dilemas**, muchos ligados a tus políticas.
- **En las redes**: ciudadanos, políticos de la oposición y medios comentan cada trimestre lo que haces y lo que pasa, con su gracia y su mala uva.

Todos los partidos son ficticios.

## Estructura

| Archivo | Contenido |
|---|---|
| `js/scenario-spain.js` | Todo el contenido de España: políticas, indicadores, grupos, partidos, provincias y sucesos |
| `js/engine.js` | Simulación genérica: efectos, presupuesto, votantes, D'Hondt e investidura |
| `js/ui.js`, `js/charts.js` | Interfaz y gráficos SVG |
| `js/social.js` | Las publicaciones de «En las redes»: personajes, medios y plantillas |
| `css/style.css` | Estilos (claro y oscuro) |

Para crear otro país basta con copiar `scenario-spain.js` y cambiar los datos: el motor no sabe nada de España.
