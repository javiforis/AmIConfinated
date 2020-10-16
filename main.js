let map = L.map('map', {});

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map & Data © <a href="http://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 20
}).addTo(map);

var browserLat;
var browserLong;  
      
navigator.geolocation.getCurrentPosition(function(position) {
    browserLat =  position.coords.latitude;
    browserLong = position.coords.longitude;
       
    marker_actual = L.marker([browserLat,browserLong]).addTo(map);
    marker_actual.bindPopup('<b>Hola </b><br>Tu estas aqui').openPopup();
    map.setView([browserLat,browserLong], 18);  
          
    console.log(browserLat);
    console.log(browserLong); 
}, 

function(err){
    console.error(err);
});      
