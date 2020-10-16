/*fetch('https://api.covid19tracking.narrativa.com/api/2020-03-22/country/spain/region/madrid')
  .then(response => response.json())
  .then(data => console.log(data));
 */ 
let data = {
    // A labels array that can contain any sort of values
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10','11', '12', '13', '14'],
    // Our series array that contains series objects or in this case series data arrays
    series: [
      [115, 232, 454, 655, 345,415, 123, 443, 555, 321,765, 510, 333, 655]
    ]
  };

function pintarDatos(data)
{
      let options = {
        width: 1200,
        height: 900
      };
      
      // Create a new line chart object where as first parameter we pass in a selector
      // that is resolving to our chart container element. The Second parameter
      // is the actual data object. As a third parameter we pass in our custom options.
      new Chartist.Line('.ct-chart', data, options);
};

pintarDatos(data);

  
  