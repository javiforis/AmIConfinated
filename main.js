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
let browserLat;
let browserLong;  

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
     
    marker_actual = L.marker([browserLat,browserLong]).addTo(map);
    marker_actual.bindPopup('<b>Hola </b><br>Tu estas aqui').openPopup();
    map.setView([browserLat,browserLong], 18);  
       
    //console.log(browserLat);
    //console.log(browserLong); 
    response();
  }, 
  function(err){
    console.error(err);
  }); 
})

cargaMapa.then(() => {
  queryString = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${browserLat}&lon=${browserLong}`;
  fetch(queryString)
        .then(response => response.json())
        .then(data => {
          console.log(data);
          rellenarDatosDistrito(data);
        });
})

//Función para rellenar todos los datos de la página para el distrito actual
function rellenarDatosDistrito(datosLocalizacion)
{
  queryString = "https://apifetcher.herokuapp.com/?id=f22c3f43-c5d0-41a4-96dc-719214d56968&filters=" + JSON.stringify({"municipio_distrito":"Madrid-" + datosLocalizacion.address.city_district});
  document.querySelector("#nombreDistrito").innerHTML = `${datosLocalizacion.address.road}, ${datosLocalizacion.address.house_number}. Distrito: ${datosLocalizacion.address.city_district}`;
  fetch(queryString).then(d => d.json()).then(d =>  {
    console.log(d);
    if (parseFloat(d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias) > 500)
    {
      //La tasa de incidencia es superior al límite luego está confinado
      document.querySelector("h1").innerText = "SI";
      //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
      document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateSI">${d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias}</span>`;
    }//if
    else
    {
      //No hay confinamiento
      document.querySelector("h1").innerText = "NO";
      //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
      document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateNO">${d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias}</span>`;
    }//else
    
    //Se escribe en el párrafo correspondiente la fecha del dato más actual
    document.querySelector("#fecha").innerHTML = `<span>Fecha del informe: </span>${d.result.records[0].fecha_informe}`;
    /*
      Se rellenan las series de datos para el gráfico a partir de cada informe existente.
      En los datos devueltos por la API hay un array con los datos para el municipio seleccionado para cada uno de los informes realizados en distintas fechas
    */
    data.labels = [];
    data.series = [[]];
    d.result.records.map((fecha) => {
      //Se rellena la fecha eliminando la hora. El gráfico necesita los datos ordenados al revés de como los proporciona la API por lo que se usa unshift para añadir por la cabeza y no push que los añade por la cola. Se formatea la fecha para poner los meses en letra y acortarla
      data.labels.unshift(formateaFecha(fecha.fecha_informe.split("T")[0]));
      //Se rellena la tasa transformando la cadena en un número decimal con parseFloat
      data.series[0].unshift(parseFloat(fecha.tasa_incidencia_acumulada_ultimos_14dias));
    });
    //Una vez listos los datos se manda pintar el gráfico                                
    pintarDatos(data);
  })
}
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
};

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

// //Captura del evento change que se dispara cada vez que el usuario cambie el valor del selector de distritos
// selectorDistritos.addEventListener("change", (evento) => {
//   /*
//     Se obtiene el valor seleccionado
//     evento.target se refiere al objeto que ha lanzado el evento, en este caso el selector
//     También se podría haber usado la variable selectorDistritos porque son lo mismo
//   */
//   distritoSeleccionado = evento.target.value;
//   //Se configura la cadena de consulta anexando el distrito seleccionado
//   queryString = "https://apifetcher.herokuapp.com/?id=f22c3f43-c5d0-41a4-96dc-719214d56968&filters=" + JSON.stringify({"municipio_distrito":distritoSeleccionado});
//   //Se lanza la consulta a la API
//   fetch(queryString).then(d => d.json()).then(d =>  {
//     console.log(d);
//     if (parseFloat(d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias) > 500)
//     {
//       //La tasa de incidencia es superior al límite luego está confinado
//       document.querySelector("h1").innerText = "SI";
//       //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
//       document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateSI">${d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias}</span>`;
//     }//if
//     else
//     {
//       //No hay confinamiento
//       document.querySelector("h1").innerText = "NO";
//       //Se escribe en el párrafo correspondiente la tasa de incidencia más actual
//       document.querySelector("#tasa").innerHTML = `<span id="enun">Tasa de incidencia acumulada durante los últimos 14 días: </span><span class="rateNO">${d.result.records[0].tasa_incidencia_acumulada_ultimos_14dias}</span>`;
//     }//else
    
//     //Se escribe en el párrafo correspondiente la fecha del dato más actual
//     document.querySelector("#fecha").innerHTML = `<span>Fecha del informe: </span>${d.result.records[0].fecha_informe}`;
//     /*
//       Se rellenan las series de datos para el gráfico a partir de cada informe existente.
//       En los datos devueltos por la API hay un array con los datos para el municipio seleccionado para cada uno de los informes realizados en distintas fechas
//     */
//     data.labels = [];
//     data.series = [[]];
//     d.result.records.map((fecha) => {
//       //Se rellena la fecha eliminando la hora. El gráfico necesita los datos ordenados al revés de como los proporciona la API por lo que se usa unshift para añadir por la cabeza y no push que los añade por la cola. Se formatea la fecha para poner los meses en letra y acortarla
//       data.labels.unshift(formateaFecha(fecha.fecha_informe.split("T")[0]));
//       //Se rellena la tasa transformando la cadena en un número decimal con parseFloat
//       data.series[0].unshift(parseFloat(fecha.tasa_incidencia_acumulada_ultimos_14dias));
//     });
//     //Una vez listos los datos se manda pintar el gráfico                                
//     pintarDatos(data);
//   })
// })

//Provocamos el evento change inicialmente para que se lance aunque el usuario no haya tocado aún el select
//let eventoChange = new Event("change");
//selectorDistritos.dispatchEvent(eventoChange);
