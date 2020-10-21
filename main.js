//Comentar esta función para activar las trazas
console.log = () => {};

//--------------- VARIABLES GLOBALES ------------------//
//Cadena que se utilizará para lanzar la consulta a la API
let queryString = "";
//Distrito seleccionado en el selector. Se inicializa con un valor
let distritoSeleccionado = "Madrid-Retiro";
//Nodo del selector de distritos que se utilizará para capturar el evento change
let selectorDistritos = document.querySelector("#districts");
//Objeto que se cargará con los valores de las tasas de incidencia por fechas
//para cada distrito seleccionado. Se necesita para trazar el gráfico
let data = {
  labels: [],
  series: [[]]
};
//Latitud y longitud de la localización actual
let browserLat = undefined;
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

//------------------------ MAPA -----------------------//
let map = L.map('map', {});

/*
La carga del mapa puede tardar y hay que esperar a que se cargue
Se crea una promesa para la carga de los datos de longitud y latitud
Cuando se tengan esos datos se llama a la función de búsqueda del distrito
*/
const cargaMapa = new Promise((response, reject) => {
  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map & Data © <a href="http://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 20
  }).addTo(map);
  navigator.geolocation.getCurrentPosition(function(position) {
    browserLat =  position.coords.latitude;
    browserLong = position.coords.longitude;

    console.log(`Obtenida latitud: ${browserLat}`);
    console.log(`Obtenida longitud: ${browserLong}`);
     
    marker_actual = L.marker([browserLat,browserLong]).addTo(map);
    marker_actual.bindPopup('<b>Hola </b><br>Tu estas aqui').openPopup();
    map.setView([browserLat,browserLong], 18);  
       
    //console.log(browserLat);
    //console.log(browserLong); 
    response();
  }, 
  function(err){
    console.error(err);
    //No se han podido obtener las coordenadas
  }); 
})

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

//Función para detectar si el distrito actual se encuentra en la caché
function esMismoDistrito(dato, data)
{
  return dato.distrito == data.address.city_district;
}//esMismoDistrito

//Función para detectar si la fecha actual se encuentra en la misma semana
function esMismaSemana(dato)
{
  //let fecha = dato.fechaConsulta;
  console.log(dato.fechaConsulta);
  let fechaDate = new Date(Date.parse(dato.fechaConsulta));
  console.log(fechaDate);

  return fechaDate.getTime()/1000 >= fechaHoy.getTime() / 1000 - (86400 * (fechaHoy.getDay()+1));
}//esMismaSemana

//Función para rellenar todos los datos de la página para el distrito actual
function rellenarDatosDistrito(datosLocalizacion)
{
  queryString = "https://apifetcher.herokuapp.com/?id=f22c3f43-c5d0-41a4-96dc-719214d56968&filters=" + JSON.stringify({"municipio_distrito":"Madrid-" + datosLocalizacion.address.city_district});
  document.querySelector("#nombreDistrito").innerHTML = `${datosLocalizacion.address.road}, ${datosLocalizacion.address.house_number}. Distrito: ${datosLocalizacion.address.city_district}`;
  fetch(queryString).then(d => d.json()).then(d => 
    {
      //console.log(d);
      console.log("Se crea el objeto para la caché")
      //CREACIÓN DEL OBJETO DE LA CACHÉ
      d.result.records.map((fecha) =>
      {
        data.labels.unshift(formateaFecha(fecha.fecha_informe.split("T")[0]));
        data.series[0].unshift(parseFloat(fecha.tasa_incidencia_acumulada_ultimos_14dias));
      });

      let datoNuevoCache = new DistritoData(datosLocalizacion.address.city_district,
                                            fechaHoy,
                                            datosLocalizacion.address.road,
                                            datosLocalizacion.address.house_number,
                                            d.result.records[0].fecha_informe,
                                            d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias,
                                            data);

      console.log("Objeto para la caché creado a partir de la consulta");
      console.log(datoNuevoCache);
      console.log("Se almacena el objeto en la caché");
      //ALMACENAMIENTO DEL OBJETO EN LA CACHÉ
      let datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));

      if (datosCache !== null)
      {
        datosCache.push(datoNuevoCache);
        localStorage.setItem("cacheCovid19", JSON.stringify(datosCache));
        console.log("Objeto almacenado en la caché. La caché tiene más de un objeto");
      }//if
      else
      {
        let cache = [];
        cache.push(datoNuevoCache);
        localStorage.setItem("cacheCovid19", JSON.stringify(cache));
        console.log("Objeto almacenado en la caché. La caché estaba vacía");
      }//else
    
      //REPRESENTACIÓN DE LOS DATOS
      console.log("Se ordena generar el gráfico");
      pintar(datoNuevoCache);
    }).catch(() => {});
}//rellenarDatosDistrito

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
    /*
    data.labels = [];
    data.series = [[]];
    datoNuevoCache.arraydata.map((fecha) => {
      //Se rellena la fecha eliminando la hora. El gráfico necesita los datos ordenados al revés de como los proporciona la API por lo que se usa unshift para añadir por la cabeza y no push que los añade por la cola. Se formatea la fecha para poner los meses en letra y acortarla
      data.labels.unshift(formateaFecha(fecha.fechaInforme.split("T")[0]));
      //Se rellena la tasa transformando la cadena en un número decimal con parseFloat
      data.series[0].unshift(parseFloat(fecha.tasa));
    });
    //Una vez listos los datos se manda pintar el gráfico                                
    pintarDatos(data);*/
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

let mantenimientoCache = ()=> {
  let ret = false;

  let datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));

  if(datosCache)
  {
    //datosCache = JSON.parse(localStorage.getItem("cacheCovid19"));
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
}

//---------------------- EJECUCIÓN -------------------------//
if (mantenimientoCache())
{
  //La caché está vigente luego hay que tenerla en cuenta
  cargaMapa.then(() => {
    queryString = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${browserLat}&lon=${browserLong}`;
    fetch(queryString)
          .then(response => response.json())
          .then(data => {
            console.log("Se ha obtenido el distrito. Se determina si es necesario usar la caché");
            let datoAPintar = comprobarConsultaDistrito(data);
            if (datoAPintar)
            {
              //Se ha detectado una consulta para el mismo distrito en la misma semana
              console.log("Se ordena representar la consulta para el dato cacheado");
              document.querySelector("#nombreDistrito").innerHTML = `${datoAPintar.calle}, ${datoAPintar.numero}. Distrito: ${datoAPintar.distrito}`;
              pintar(datoAPintar);
            }//if
            else
            {
              //Hay que lanzar consulta pues no hay datos en la caché para utilizar
              rellenarDatosDistrito(data);
            }//else
          }).catch(() => {
            //No se ha podido cumplir la consulta del distrito
          });
  })
}//if
else
{
  //No hay caché activa, por lo que la aplicación debe realizar la consulta completa
  cargaMapa.then(() => {
    queryString = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${browserLat}&lon=${browserLong}`;
    fetch(queryString)
          .then(response => response.json())
          .then(data => {
              console.log("No hay caché. Hay que lanzar consulta")
              //Hay que lanzar consulta pues no hay datos en la caché para utilizar
              rellenarDatosDistrito(data);
          }).catch(() => {
            //No se ha podido cumplir la consulta del distrito
          });
  })
}//else

