//Comentar esta función para activar las trazas
console.log = () => {};

//--------------- VARIABLES GLOBALES ------------------//
//Cadena que se utilizará para lanzar la consulta a la API
let queryString = "";
//Latitud y longitud de la localización actual
let browserLat  = undefined;
let browserLong = undefined;
//Fecha actual
let fechaHoy = new Date();
//Clase para almacenar consultas en la caché
class DistritoData{
  constructor(distrito, fechaConsulta, calle, numero, fechaInforme, tasa, dataObject)
  {
    this.distrito       = distrito;
    this.fechaConsulta  = fechaConsulta;
    this.calle          = calle;
    this.numero         = numero;
    this.fechaInforme   = fechaInforme;
    this.tasa           = tasa;
    this.dataObject     = dataObject;
  }
};
/*
//Distrito seleccionado en el selector. Se inicializa con un valor
let distritoSeleccionado = "Madrid-Retiro";
//Nodo del selector de distritos que se utilizará para capturar el evento change
let selectorDistritos = document.querySelector("#districts");
*/

/*
La carga del mapa puede tardar y hay que esperar a que se cargue
Se crea una promesa para la carga de los datos de longitud y latitud
Cuando se tengan esos datos se llama a la función de búsqueda del distrito
*/
const cargaMapa = new Promise((response, reject) => {
  let map = L.map('map', {});
  L.tileLayer(  'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                {
                  attribution: 'Map & Data © <a href="http://openstreetmap.org">OpenStreetMap</a>',
                  maxZoom: 20
                }).addTo(map);

  navigator.geolocation.getCurrentPosition( (position) => {
                                            browserLat =  position.coords.latitude;
                                            browserLong = position.coords.longitude;

                                            console.log(`Obtenida latitud: ${browserLat}`);
                                            console.log(`Obtenida longitud: ${browserLong}`);
                                            
                                            marker_actual = L.marker([browserLat,browserLong]).addTo(map);
                                            marker_actual.bindPopup('<b>Hola </b><br>Tu estas aqui').openPopup();
                                            map.setView([browserLat,browserLong], 18);  

                                            response();
                                            }, 
                                            (err) => {
                                            console.error(err);
                                            //No se han podido obtener las coordenadas
                                            }); 
                                          });

///////////////////////////////////////////////////////////////////////////
//------------------------------ FUNCIONES ------------------------------//
///////////////////////////////////////////////////////////////////////////

//Función para realizar la comprobación de que la caché existe y es válida
/*
  En el localStorage se almacena a modo de caché un array de objetos.
  Cada objeto tiene todos los datos necesarios para representar una consulta de un distrito.
  La caché contiene un objeto por cada distrito que se haya consultado durante la semana en curso.
  Dado que los datos se actualizan cada semana (supuestamente), la caché sólo es válida para la semana en curso.
  Al hacer el mantenimiento de la caché se elimina ésta si no se correspondiera con la semana en curso.
*/
let mantenimientoCache = ()=> {
  let ret = false;

  let datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));

  if(datosCache)
  {
    if (!esMismaSemana(datosCache[0]))
    {
        localStorage.removeItem("cacheCovid19");
        console.log("Caché no válida. Se borra la caché");
        ret = false;
    }
    else
    {
      console.log("Caché válida");
      ret = true;
    }//else
  }
  else
  {
    console.log("La caché está vacía");
    ret = false;
  }//else

  return ret;
}//mantenimientoCache

//Función para determinar si hay datos del distrito actual en la caché
/*
Una vez comprobado que la caché está vigente hay que saber si ya se ha realizado durante la semana en curso alguna consulta para el distrito actual.
Caso de haberse realizado, dicha consulta estará guardada en un objeto dentro de la caché.
Esta función busca en la caché si existe un objeto para el distrito actual.
Si no lo hay entonces devuelve null para que se realice la consulta.
Si por el contrario existe un objeto para este distrito en la caché, no hay que realizar consulta y se devuelve dicho objeto para que sea utilizado para representar los datos.
*/
function comprobarConsultaDistrito(data)
{
  let datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));

  if (datosCache !== null)
  {
    //Existen datos cacheados
    for (let cont = 0; cont < datosCache.length; cont++)
    {
      if (esMismoDistrito(datosCache[cont], data))
      {
        //Hay un dato en la caché para el mismo distrito en la misma semana
        //No hay que lanzar consulta sino que se muestran los datos de la consulta cacheada
        console.log("Dato compatible en la caché. Se usa el dato cacheado");
        return datosCache[cont];
      }//if
    }//for
  }//if
  //No existen datos cacheados o no se ha encontrado ninguno para el mismo distrito
  //Hay que lanzar consulta
  console.log("No existen datos cacheados o no se ha encontrado ninguno para el mismo distrito. Hay que lanzar consulta");
  return null;
}//comprobarConsultaDistrito

//Función para detectar si un objeto de la caché se corresponde al distrito actual
function esMismoDistrito(dato, data)
{
  return dato.distrito == data.address.city_district;
}//esMismoDistrito

//Función para consultar los datos del distrito actual
/*
Esta función lanza la consulta para obtener los datos del distrito actual.
Una vez obtenidos los datos se crea el objeto con los mismos y se guarda en la caché para evitar futuras consultas para este mismo distrito en la semana en curso.
Luego se representan los datos en pantalla.
*/
function consultarDistrito(datosLocalizacion)
{
  queryString = "https://apifetcher.herokuapp.com/?id=f22c3f43-c5d0-41a4-96dc-719214d56968&filters=" + JSON.stringify({"municipio_distrito":"Madrid-" + datosLocalizacion.address.city_district});
  fetch(queryString).then(d => d.json()).then(d => 
    {
      //console.log(d);
      //CREACIÓN DEL OBJETO DE LA CACHÉ
      console.log("Se crea el objeto para la caché");

      let objetoCache = crearObjetoCache(d, datosLocalizacion, fechaHoy);

      console.log("Objeto para la caché creado a partir de la consulta");
      console.log(objetoCache);
      
      //ALMACENAMIENTO DEL OBJETO EN LA CACHÉ
      console.log("Se almacena el objeto en la caché");

      almacenarObjetoCache(objetoCache);
    
      //REPRESENTACIÓN DE LOS DATOS
      representarDatos(objetoCache);
 
    }).catch(() => {});
}//consultarDistrito

//Función que genera un objeto con los datos de la consulta para el distrito
function crearObjetoCache(datosConsulta, datosDistrito, fechaActual)
{
  //Objeto que se cargará con los valores de las tasas de incidencia por fechas
  //para cada distrito seleccionado. Se necesita para trazar el gráfico
  let datosGrafica = {
    labels: [],
    series: [[]]
  };
  datosConsulta.result.records.map((fecha) =>
  {
    datosGrafica.labels.unshift(formateaFecha(fecha.fecha_informe.split("T")[0]));
    datosGrafica.series[0].unshift(parseFloat(fecha.tasa_incidencia_acumulada_ultimos_14dias));
  });

  let datoNuevoCache = new DistritoData(datosDistrito.address.city_district,
                                        fechaActual,
                                        datosDistrito.address.road,
                                        datosDistrito.address.house_number,
                                        datosConsulta.result.records[0].fecha_informe,
                                        datosConsulta.result.records[0].tasa_incidencia_acumulada_ultimos_14dias,
                                        datosGrafica);
  return datoNuevoCache;
}//crearObjetoCache

//Función para almacenar el objeto de los datos de la consulta en la caché
function almacenarObjetoCache(objetoConsulta)
{
  let datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));

  if (datosCache !== null)
  {
    datosCache.push(objetoConsulta);
    localStorage.setItem("cacheCovid19", JSON.stringify(datosCache));
    console.log("Objeto almacenado en la caché. La caché tiene más de un objeto");
  }//if
  else
  {
    let cache = [];
    cache.push(objetoConsulta);
    localStorage.setItem("cacheCovid19", JSON.stringify(cache));
    console.log("Objeto almacenado en la caché. La caché estaba vacía");
  }//else
}//almacenarObjetoCache

//Función para representar los datos del distrito en pantalla (textos y gráfica)
function representarDatos(objeto)
{
  if (objeto.calle == undefined)
  {
    document.querySelector("#nombreDistrito").innerHTML = `Distrito: ${objeto.distrito}`;
  }//if
  else
  {
    if (objeto.numero == undefined)
    {
      document.querySelector("#nombreDistrito").innerHTML = `${objeto.calle}. Distrito: ${objeto.distrito}`;
    }//if
    else
    {
      document.querySelector("#nombreDistrito").innerHTML = `${objeto.calle}, ${objeto.numero}. Distrito: ${objeto.distrito}`;
    }//else
  }//else
  console.log("Se ordena generar el gráfico");
  pintar(objeto);
}//representarDatos

//Función para detectar si la fecha actual se encuentra en la misma semana
/*
Esta función recibe un objeto de la caché y examina la fecha en la que se hizo la consulta.
Como dicha fecha está almacenada como un string, para poder manipularla como fecha es necesario crear un objeto Date a partir de esa cadena con la función parse. Dicha función es una función estática de la clase Date, por lo que se puede llamar sin necesidad de instanciar un objeto de esa clase.
Una vez transformada ya se le puede aplicar la función getTime que devuelve el número de milisegundos que le corresponden.
      
      fechaDate.getTime()/1000 ---> fecha de la consulta transformada en segundos. 
      fechaHoy.getTime() / 1000 ---> fecha actual en segundos.
      86400 ---> número de segundos en un día.
      fechaHoy.getDay() ---> número del día actual 0 es lunes, 1 es martes, ..., 6 es domingo

La condición establece que la fecha de la consulta se encuentre dentro de los días desde el principio de la semana actual hasta el día en curso.
En ese caso, la consulta es de la misma semana y se devuelve true.
*/
function esMismaSemana(dato)
{
  console.log(dato.fechaConsulta);
  let fechaDate = new Date(Date.parse(dato.fechaConsulta));
  console.log(fechaDate);

  return fechaDate.getTime()/1000 >= fechaHoy.getTime() / 1000 - (86400 * (fechaHoy.getDay()+1));
}//esMismaSemana

//Función para representar en la pantalla los datos del distrito en curso
/*
Los datos se toman:
  * De un objeto de la caché si la consulta ya se hizo durante esta semana.
  * Del objeto recién creado en la consulta si no se usa la caché.
*/
function pintar(datoNuevoCache)
{
  if (parseFloat(datoNuevoCache.tasa) > 500)
    {
      //La tasa de incidencia es superior al límite luego está confinado
      document.querySelector("h1").innerText = "SI";
      //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
      document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateSI">${datoNuevoCache.tasa}</span>`;
    }//if
    else
    {
      //No hay confinamiento
      document.querySelector("h1").innerText = "NO";
      //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
      document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateNO">${datoNuevoCache.tasa}</span>`;
    }//else
    
    //Se escribe en el párrafo correspondiente la fecha del dato más actual
    document.querySelector("#fecha").innerHTML = `<span>Fecha del informe: </span>${datoNuevoCache.fechaInforme}`;
    /*
      Se rellenan las series de datos para el gráfico a partir de cada informe existente.
      En los datos devueltos por la API hay un array con los datos para el municipio seleccionado para cada uno de los informes realizados en distintas fechas
    */
    pintarDatos(datoNuevoCache.dataObject);
}//pintar

//Función que pinta el gráfico a partir de los datos de las series
function pintarDatos(data)
{
      let options = {
        width: 320,
        height: 150,
        chartPadding: {
          right: 40,
          bottom: 40,
          top: 30
        }
      };
      
      // Create a new line chart object where as first parameter we pass in a selector
      // that is resolving to our chart container element. The Second parameter
      // is the actual data object. As a third parameter we pass in our custom options.
      new Chartist.Line('.ct-chart', data, options);
      console.log("Gráfica pintada");
}//pintarDatos

//Función que formatea los textos de las fechas para que se muestren mejor en la base del gráfico
/*
Toma una fecha en el formato YYYY-MM-DD y la transforma en DD-(Ene, Feb,..., Dic).
*/
function formateaFecha(fecha)
{
  let fechaFormateada = "";
  let componentes = fecha.split("-");
  fechaFormateada += componentes[2];

  switch (componentes[1])
  {
    case "01":
      {
        fechaFormateada += "-Ene";
        break;
      }
    case "02":
      {
        fechaFormateada += "-Feb";
        break;
      }
    case "03":
      {
        fechaFormateada += "-Mar";
        break;
      }
    case "04":
      {
        fechaFormateada += "-Abr";
        break;
      }
    case "05":
      {
        fechaFormateada += "-May";
        break;
      }
    case "06":
      {
        fechaFormateada += "-Jun";
        break;
      }
    case "07":
      {
        fechaFormateada += "-Jul";
        break;
      }
    case "08":
      {
        fechaFormateada += "-Ago";
        break;
      }
    case "09":
      {
        fechaFormateada += "-Sep";
        break;
      }
    case "10":
      {
        fechaFormateada += "-Oct";
        break;
      }
    case "11":
      {
        fechaFormateada += "-Nov";
        break;
      }
    case "12":
    {
      fechaFormateada += "-Dic";
      break;
    }
  }//switch
  return fechaFormateada;
}//formateaFecha

function borrarTodo()
{
  let paginaEntera = document.querySelector("main");
  if (paginaEntera)
  {
    paginaEntera.remove();
  }//if
}//borrarTodo

function mensajeError(pintarMensajeError)
{
  borrarTodo();
  let mensajeError = document.createElement("h1");
  mensajeError.id = "mensajeError";
  mensajeError.innerText = pintarMensajeError;
}//mensajeError

///////////////////////////////////////////////////////////////////////////
//------------------------------ EJECUCIÓN ------------------------------//
///////////////////////////////////////////////////////////////////////////
cargaMapa.then(() => {
  queryString = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${browserLat}&lon=${browserLong}`;
  fetch(queryString)
        .then(response => response.json())
        .then(data => {
          console.log("Se ha obtenido el distrito. Se realiza mantenimiento de la caché");

          if (mantenimientoCache())
          {
            //La caché está vigente luego hay que tenerla en cuenta
            console.log("Se determina si es necesario usar la caché");
            let objetoCache = comprobarConsultaDistrito(data);
            if (objetoCache)
            {
              //Se ha detectado una consulta para el mismo distrito en la misma semana
              console.log("Se ordena representar la consulta para el dato cacheado");
              representarDatos(objetoCache);
            }//if
            else
            {
              //Hay que lanzar consulta pues no hay datos en la caché para utilizar
              consultarDistrito(data);
            }//else
          }//if
          else
          {
            //No hay caché activa, por lo que la aplicación debe realizar la consulta completa
            consultarDistrito(data);
          }//else
        }).catch(() => {
          //No se ha podido cumplir la consulta del distrito
        });
});
