import define1 from "https://api.observablehq.com/@jashkenas/inputs.js?v=3&resolutions=3e87bf769168da87@1494";
import define2 from "https://api.observablehq.com/@mbostock/synchronized-views.js?v=3&resolutions=3e87bf769168da87@1494";

function _desc_intro(md){return(
md`# Photo-voltaic energy generation system sizing
Welcome to a calculator for sizing a solar energy generation system.  

The purpose of this tool is to give an easy way to understand how much energy you will get from a solar energy generation system.

Solar energy has many advantages including reducing: carbon emissions, use of fossil fuels, and reliance on foreign governments, but did you know it can also be cheaper in the long-run?

Use this tool to see if solar energy generation is right for you.
`
)}

function _desc_location(md){return(
md`
## Step one: Location
We need to know your estimated location to calculate solar yields.  
It is configured to give reasonable results for the [Lago Bello residential subdivision](https://www.lagobello.com) in sunny South Texas.
`
)}

function _lonlat(coordinates,lon_def,lat_def){return(
coordinates({
  title: "Location",
  description: "Enter the coordinates of where your panels will be located.",
  value: [lon_def, lat_def],
  submit: true
})
)}

function _worldMap1(worldMapCoordinates,lonlat){return(
worldMapCoordinates(lonlat)
)}

function _olMap(map){return(
map.getTargetElement()
)}

function _desc_irradiation(md){return(
md`
## Step two: Solar irradation
Using your location, we will ask [NASA servers' POWER API](https://power.larc.nasa.gov/) to retrieve the solar irradation for your location (thanks, NASA!).
`
)}

function _desc_summary_irradiation(md,summary_cached_disclaimer,summary_irradiation){return(
md`${summary_cached_disclaimer} ${summary_irradiation}`
)}

function _desc_nasa_disclaimer(html){return(
html`<i>"These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through 
the NASA Earth Science/Applied Science Program."</i>`
)}

function _desc_panels(md){return(
md`
## Step three: Panel Selection
We need to know what panel you will be using to calculate solar yields.
`
)}

function _panel_count(slider){return(
slider({
  min: 0, 
  max: 40, 
  step: 1, 
  value: 8, 
  title: "Solar Panels"
})
)}

function _panel_area(text){return(
text({value: "1.2", description: "Please enter single panel area in m^2 and press Go", submit: "Go"})
)}

function _panel_efficiency(text){return(
text({value: "0.15", description: "Please enter panel efficiency in decimal format", submit: "Go"})
)}

function _desc_panel_area(md,panel_area_total){return(
md` Total solar panel surface area is \`\`${panel_area_total} m^2\`\` `
)}

function _desc_energy(md){return(
md`
## Step four: Energy production
`
)}

function _desc_summary_energy_production(md,summary_energy_production){return(
md`${summary_energy_production}`
)}

function _desc_energy_us_average(md){return(
md`The median energy consumption in a US Household is around 10,766 kWh yearly.`
)}

function _desc_cost(md){return(
md`
## Step five: Cost analysis
Please insert the estimated cost per KWh that your solar energy generation system is going to replace.  
You can use your own electric bill to estimate this. Simply divide amount paid by KWh consumed and you will obtain the amount the total amount paid per KWh of that energy.  
*Hint: you can use any currency, it doesn't have to be dollars*
`
)}

function _energy_price(text){return(
text({value: "0.12", description: "Please enter price in USD", submit: "Go"})
)}

function _desc_summary_energy_production_dollars(md,summary_energy_production_dollars){return(
md`${summary_energy_production_dollars}`
)}

function _20(md){return(
md`
### Code Appendix
Here you may see all the code that is used to create this page.
`
)}

async function _ol(require,html)
{
  // OpenLayers doesn’t publish a build to npm, so we can’t use unpkg. :(
  const ol = await require("https://openlayers.org/en/v5.3.0/build/ol.js").catch(() => window.ol);
  if (!ol.css) ol.css = document.head.appendChild(html`<link rel=stylesheet href="https://openlayers.org/en/v5.3.0/css/ol.css">`);
  return ol;
}


function _map(ol,html,lon,lat)
{
  let map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ],
    target: html`<div style='height:200px;width:400px'></div>`,
    view: new ol.View({
      center: ol.proj.fromLonLat([lon, lat]),
      zoom: 16
    })
  });

  // add marker
  var marker = new ol.Feature({
  geometry: new ol.geom.Point(
    ol.proj.fromLonLat([lon,lat])
   ), 
  });
  var vectorSource = new ol.source.Vector({
    features: [marker]
  });
  var markerVectorLayer = new ol.layer.Vector({
    source: vectorSource,
  });
  
  map.addLayer(markerVectorLayer);
  
  setTimeout(() => map.updateSize(), 1);
  return map;
}


function _lat_def(){return(
26.053
)}

function _lon_def(){return(
-97.553
)}

function _lat(lonlat){return(
lonlat[1]
)}

function _lon(lonlat){return(
lonlat[0]
)}

function _url(query_year,lat,lon){return(
"https://power.larc.nasa.gov/api/temporal/hourly/point?start=" + query_year + "0101&end=" + query_year + "1231&latitude=" + lat + "&longitude=" +  lon + "&community=ag&parameters=ALLSKY_SFC_SW_DWN&format=json&header=true&time-standard=utc"
)}

function _bad_url(){return(
"https://www.example.com/"
)}

function _cors_proxy(){return(
''
)}

function _response_json(cors_proxy,url){return(
fetch(url, {
  // Keep this as a simple CORS GET. NASA POWER currently returns
  // access-control-allow-origin: * for these JSON endpoints, while
  // OPTIONS preflight may fail. Do not route through a public CORS proxy.
  cache: 'no-store',
  mode: 'cors',
  redirect: 'follow',
}).then(response => {
  if (!response.ok ) {
    console.warn("Response not ok from NASA Power API");
    return undefined;
  } else {
    return response.json()
  }
}).catch(error => {return error;})
)}

function _use_cached_response(response_json)
{
  
  
var result = false;

  
if (typeof response_json == 'undefined' ) 
{
  console.warn("response_json is undefined. Using cached data")
  return true;
}

if ( response_json instanceof Error) 
{
  console.warn("response_json is Error. Using cached data")
  return true;
}

  if (typeof response_json !== 'undefined' ) 
    if (!response_json.hasOwnProperty("header") ) 
    {
      console.warn("response_json does not have header. Using cached data")
      return true;
     }

  return false;
}


function _default_response_2020_south_texas(){return(
JSON.parse(`{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [
      -97,
      26,
      0.2
    ]
  },
  "properties": {
    "parameter": {
      "ALLSKY_SFC_SW_DWN": {
        "20200101": 0.79,
        "20200102": 0.95,
        "20200103": 4.2,
        "20200104": 4.61,
        "20200105": 4.61,
        "20200106": 4.42,
        "20200107": 3.59,
        "20200108": 4.31,
        "20200109": 2.54,
        "20200110": 2.83,
        "20200111": 4.55,
        "20200112": 3.57,
        "20200113": 2.44,
        "20200114": 3.86,
        "20200115": 3.73,
        "20200116": 3.55,
        "20200117": 4.11,
        "20200118": 2.15,
        "20200119": 1.33,
        "20200120": 3.85,
        "20200121": 3.35,
        "20200122": 1.06,
        "20200123": 3.96,
        "20200124": 4.48,
        "20200125": 2.02,
        "20200126": 2.7,
        "20200127": 4.76,
        "20200128": 2.02,
        "20200129": 5.27,
        "20200130": 1.44,
        "20200131": 3.29,
        "20200201": 4.1,
        "20200202": 5.01,
        "20200203": 2.33,
        "20200204": 3.11,
        "20200205": 0.85,
        "20200206": 5.15,
        "20200207": 5.47,
        "20200208": 4.36,
        "20200209": 2.67,
        "20200210": 3.47,
        "20200211": 3.24,
        "20200212": 1.37,
        "20200213": 3.47,
        "20200214": 2.43,
        "20200215": 4.7,
        "20200216": 3.72,
        "20200217": 4.21,
        "20200218": 5.05,
        "20200219": 2.39,
        "20200220": 1.07,
        "20200221": 1.76,
        "20200222": 4.84,
        "20200223": 2.37,
        "20200224": 3.15,
        "20200225": 2.1,
        "20200226": 5.34,
        "20200227": 6.26,
        "20200228": 5.75,
        "20200229": 5.92,
        "20200301": 4.13,
        "20200302": 2.42,
        "20200303": 2.74,
        "20200304": 2.56,
        "20200305": 5.01,
        "20200306": 5.79,
        "20200307": 3.29,
        "20200308": 5.29,
        "20200309": 3.99,
        "20200310": 1.96,
        "20200311": 5.95,
        "20200312": 5.04,
        "20200313": 5.1,
        "20200314": 3.84,
        "20200315": 4.6,
        "20200316": 4.5,
        "20200317": 5.83,
        "20200318": 5.96,
        "20200319": 6.27,
        "20200320": 4.01,
        "20200321": 5.03,
        "20200322": 5.56,
        "20200323": 6.33,
        "20200324": 6.63,
        "20200325": 6.44,
        "20200326": 6.79,
        "20200327": 6.96,
        "20200328": 6.11,
        "20200329": 5.47,
        "20200330": 5.66,
        "20200331": 5.74,
        "20200401": 6.03,
        "20200402": 4.69,
        "20200403": 5.1,
        "20200404": 1.22,
        "20200405": 2.68,
        "20200406": 5.25,
        "20200407": 5.66,
        "20200408": 5.75,
        "20200409": 5.49,
        "20200410": 5.08,
        "20200411": 3.25,
        "20200412": 6.32,
        "20200413": 6.6,
        "20200414": 3.59,
        "20200415": 3.78,
        "20200416": 4.99,
        "20200417": 4.2,
        "20200418": 4.01,
        "20200419": 4.34,
        "20200420": 5.83,
        "20200421": 6.66,
        "20200422": 4.88,
        "20200423": 5.02,
        "20200424": 7.59,
        "20200425": 6.62,
        "20200426": 6.9,
        "20200427": 6.92,
        "20200428": 6.71,
        "20200429": 4,
        "20200430": 8.03,
        "20200501": 8.12,
        "20200502": 7.86,
        "20200503": 7.51,
        "20200504": 7.24,
        "20200505": 6.63,
        "20200506": 5.83,
        "20200507": 6.67,
        "20200508": 6.63,
        "20200509": 2.82,
        "20200510": 7.15,
        "20200511": 7.46,
        "20200512": 6.86,
        "20200513": 7.19,
        "20200514": 5.33,
        "20200515": 5.86,
        "20200516": 2.26,
        "20200517": 7.55,
        "20200518": 8.03,
        "20200519": 7.87,
        "20200520": 7.64,
        "20200521": 5.51,
        "20200522": 7.26,
        "20200523": 7.54,
        "20200524": 7.37,
        "20200525": 6.31,
        "20200526": 3.67,
        "20200527": 7.94,
        "20200528": 6.64,
        "20200529": 2.43,
        "20200530": 5.47,
        "20200531": 4.06,
        "20200601": 4.49,
        "20200602": 7.03,
        "20200603": 7.44,
        "20200604": 7.6,
        "20200605": 7.77,
        "20200606": 7.66,
        "20200607": 7.39,
        "20200608": 7.72,
        "20200609": 7.22,
        "20200610": 5.94,
        "20200611": 7.85,
        "20200612": 7.87,
        "20200613": 7.52,
        "20200614": 7.77,
        "20200615": 7.26,
        "20200616": 7.27,
        "20200617": 7.36,
        "20200618": 6.24,
        "20200619": 5.8,
        "20200620": 7.33,
        "20200621": 6.78,
        "20200622": 7.37,
        "20200623": 3.36,
        "20200624": 5.88,
        "20200625": 1.41,
        "20200626": 2.88,
        "20200627": 5.61,
        "20200628": 7.25,
        "20200629": 7.11,
        "20200630": 7.19,
        "20200701": 7.02,
        "20200702": 7.44,
        "20200703": 7.11,
        "20200704": 7.42,
        "20200705": 7.44,
        "20200706": 7.54,
        "20200707": 7.25,
        "20200708": 7.45,
        "20200709": 7.72,
        "20200710": 7.91,
        "20200711": 7.85,
        "20200712": 7.56,
        "20200713": 7.85,
        "20200714": 7.78,
        "20200715": 7.72,
        "20200716": 7.09,
        "20200717": 2.63,
        "20200718": 6.99,
        "20200719": 7.17,
        "20200720": 7.64,
        "20200721": 7.56,
        "20200722": 7.41,
        "20200723": 7.09,
        "20200724": 2.22,
        "20200725": 0.53,
        "20200726": 2.47,
        "20200727": 6.01,
        "20200728": 3.27,
        "20200729": 5.54,
        "20200730": 7.53,
        "20200731": 7.44,
        "20200801": 7.09,
        "20200802": 5.79,
        "20200803": 7.5,
        "20200804": 7.57,
        "20200805": 7.59,
        "20200806": 7.25,
        "20200807": 7.32,
        "20200808": 6.71,
        "20200809": 6.99,
        "20200810": 7.01,
        "20200811": 7.32,
        "20200812": 7.22,
        "20200813": 7.39,
        "20200814": 7.43,
        "20200815": 7.38,
        "20200816": 7.13,
        "20200817": 7.07,
        "20200818": 6.46,
        "20200819": 6.75,
        "20200820": 7.24,
        "20200821": 7.18,
        "20200822": 7.11,
        "20200823": 6.87,
        "20200824": 6.76,
        "20200825": 5.47,
        "20200826": 6.06,
        "20200827": 6.03,
        "20200828": 6.84,
        "20200829": 6.85,
        "20200830": 6.46,
        "20200831": 6.48,
        "20200901": 6.73,
        "20200902": 6.63,
        "20200903": 6.44,
        "20200904": 5.35,
        "20200905": 3,
        "20200906": 3.8,
        "20200907": 4.02,
        "20200908": 6.33,
        "20200909": 6.57,
        "20200910": 5.38,
        "20200911": 3.77,
        "20200912": 6.11,
        "20200913": 3.44,
        "20200914": 0.66,
        "20200915": 2.12,
        "20200916": 4.96,
        "20200917": 2.96,
        "20200918": 2.58,
        "20200919": 4.89,
        "20200920": 5.17,
        "20200921": 1.83,
        "20200922": 5.52,
        "20200923": 6.21,
        "20200924": 6.14,
        "20200925": 5.72,
        "20200926": 5.95,
        "20200927": 6.25,
        "20200928": 4.54,
        "20200929": 6.57,
        "20200930": 6.65,
        "20201001": 6.51,
        "20201002": 5.61,
        "20201003": 6.19,
        "20201004": 5.82,
        "20201005": 5.89,
        "20201006": 5.05,
        "20201007": 1.98,
        "20201008": 3.42,
        "20201009": 4.74,
        "20201010": 5.89,
        "20201011": 5.77,
        "20201012": 5.68,
        "20201013": 5.49,
        "20201014": 5.58,
        "20201015": 5.58,
        "20201016": 3.74,
        "20201017": 5.01,
        "20201018": 5.5,
        "20201019": 5.18,
        "20201020": 5.45,
        "20201021": 5.01,
        "20201022": 4.91,
        "20201023": 5.31,
        "20201024": 1.6,
        "20201025": 5,
        "20201026": 5.09,
        "20201027": 2.86,
        "20201028": 2.09,
        "20201029": 5.51,
        "20201030": 2.55,
        "20201031": 5.16,
        "20201101": 4.98,
        "20201102": 4.77,
        "20201103": 5.03,
        "20201104": 4.73,
        "20201105": 4.88,
        "20201106": 4.74,
        "20201107": 4.76,
        "20201108": 5.05,
        "20201109": 5,
        "20201110": 4.86,
        "20201111": 4.67,
        "20201112": 4.73,
        "20201113": 4.69,
        "20201114": 4.52,
        "20201115": 3.14,
        "20201116": 4.1,
        "20201117": 4.28,
        "20201118": 4.47,
        "20201119": 4.72,
        "20201120": 4.28,
        "20201121": 4.11,
        "20201122": 4.04,
        "20201123": 4.04,
        "20201124": 4.09,
        "20201125": 2.92,
        "20201126": 3.59,
        "20201127": 4.19,
        "20201128": 2.99,
        "20201129": 1.56,
        "20201130": 3.36,
        "20201201": 3.66,
        "20201202": 2.13,
        "20201203": 2.79,
        "20201204": 2.27,
        "20201205": 0.58,
        "20201206": 2.78,
        "20201207": 4.49,
        "20201208": 3.89,
        "20201209": 4.52,
        "20201210": 4.25,
        "20201211": 2.83,
        "20201212": 2.58,
        "20201213": 2.57,
        "20201214": 1.37,
        "20201215": 2.51,
        "20201216": 4.18,
        "20201217": 4.46,
        "20201218": 2.45,
        "20201219": 1.88,
        "20201220": 4.47,
        "20201221": 4.18,
        "20201222": 2.43,
        "20201223": 2.16,
        "20201224": 4.26,
        "20201225": 4.43,
        "20201226": 3.39,
        "20201227": 4.23,
        "20201228": 3.86,
        "20201229": 2.62,
        "20201230": 3.62,
        "20201231": 2.01
      }
    }
  },
  "header": {
    "title": "NASA/POWER CERES/MERRA2 Native Resolution Daily Data",
    "api": {
      "version": "v2.2.4",
      "name": "POWER Daily API"
    },
    "fill_value": -999,
    "start": "20200101",
    "end": "20201231"
  },
  "messages": [],
  "parameters": {
    "ALLSKY_SFC_SW_DWN": {
      "units": "kW-hr/m^2/day",
      "longname": "All Sky Surface Shortwave Downward Irradiance"
    }
  },
  "times": {
    "data": 0.243,
    "process": 0.02
  }
}`)
)}

function _solar_irradiance_daily(use_cached_response,response_json,default_response_2020_south_texas)
{
 
// access the data values within the json data response 
if (!use_cached_response)
  {
    var properties = response_json["properties"]
  } else {
    console.warn("using cached solar irradiance values")
    var properties = default_response_2020_south_texas["properties"];
  }

  var parameter = properties.parameter;

  for ( var p in parameter ) 
  {
        var values = properties.parameter[p];
  }
 return values
}


function _solar_irradiance_daily_filtered(solar_irradiance_daily)
{
 
  var filtered = solar_irradiance_daily
  for ( var date in filtered  ) 
  {
   if (filtered[date] < 0) {
       delete filtered[date];
    }
  }
  
 return filtered
}


function _solar_irradiance_average(solar_irradiance_daily_filtered)
{

  var sum = 0;
  var length = Object.keys(solar_irradiance_daily_filtered).length;
  for ( var date in solar_irradiance_daily_filtered  ) 
  {
        sum += parseFloat(solar_irradiance_daily_filtered[date] );
  }
  var average = sum/length;
 return average
}


function _panel_area_total(panel_area,panel_count){return(
panel_area*panel_count
)}

function _daily_energy(solar_irradiance_average,panel_area_total,panel_efficiency){return(
solar_irradiance_average  * panel_area_total * panel_efficiency * 24
)}

function _yearly_energy(daily_energy){return(
daily_energy * 365
)}

function _daily_energy_dollars(daily_energy,energy_price){return(
daily_energy*energy_price
)}

function _yearly_energy_dollars(daily_energy_dollars){return(
daily_energy_dollars * 365
)}

function _current_year(){return(
new Date().getFullYear()
)}

function _query_year(current_year){return(
current_year - 1
)}

function _cached_year(){return(
2020
)}

function _summary_cached_disclaimer(use_cached_response,query_year,cached_year)
{
 
  var string;
  if (use_cached_response)
  {
    string = "We failed to retrieve the <code>" + query_year + "</code> solar irradiance from the NASA POWER API; using recorded <code>" + cached_year + "</code> solar irradiance data for South Texas for following calculations.\n\n"
  } else { 
    string = ""
  }
  return string;
}


function _summary_irradiation(use_cached_response,cached_year,query_year,lon,lat,solar_irradiance_average)
{

  var year;
  if (use_cached_response)
  {
    year=cached_year
  } else { 
    year=query_year
  }
  
  var string;
     string = "According to NASA, in <code>" + year + "</code>, the average daily solar irradiance for a horizontal surface at <code>" + lon.toFixed(3) + "W, " + lat.toFixed(3) + "N</code>  was  <code>" + solar_irradiance_average.toFixed(2) + " KWh/m^2</code>"
  return string;
}


function _summary_energy_production(daily_energy,yearly_energy){return(
"Your calculated energy production is: <code>" + daily_energy.toFixed(2) + " KWh</code> daily or <code>" + yearly_energy.toFixed(2) + " KWh</code> yearly."
)}

function _summary_energy_production_dollars(yearly_energy,energy_price,daily_energy_dollars,yearly_energy_dollars){return(
"By generating <code>" + yearly_energy.toFixed(2) + " KWh @ $" + energy_price + "/KWh</code>, the value of generated energy is: <code>$" + daily_energy_dollars.toFixed(2) + "</code> daily or <code>$" + yearly_energy_dollars.toFixed(2) + "</code> yearly."
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("desc_intro")).define("desc_intro", ["md"], _desc_intro);
  main.variable(observer("desc_location")).define("desc_location", ["md"], _desc_location);
  main.variable(observer("viewof lonlat")).define("viewof lonlat", ["coordinates","lon_def","lat_def"], _lonlat);
  main.variable(observer("lonlat")).define("lonlat", ["Generators", "viewof lonlat"], (G, _) => G.input(_));
  main.variable(observer("viewof worldMap1")).define("viewof worldMap1", ["worldMapCoordinates","lonlat"], _worldMap1);
  main.variable(observer("worldMap1")).define("worldMap1", ["Generators", "viewof worldMap1"], (G, _) => G.input(_));
  main.variable(observer("olMap")).define("olMap", ["map"], _olMap);
  main.variable(observer("desc_irradiation")).define("desc_irradiation", ["md"], _desc_irradiation);
  main.variable(observer("desc_summary_irradiation")).define("desc_summary_irradiation", ["md","summary_cached_disclaimer","summary_irradiation"], _desc_summary_irradiation);
  main.variable(observer("desc_nasa_disclaimer")).define("desc_nasa_disclaimer", ["html"], _desc_nasa_disclaimer);
  main.variable(observer("desc_panels")).define("desc_panels", ["md"], _desc_panels);
  main.variable(observer("viewof panel_count")).define("viewof panel_count", ["slider"], _panel_count);
  main.variable(observer("panel_count")).define("panel_count", ["Generators", "viewof panel_count"], (G, _) => G.input(_));
  main.variable(observer("viewof panel_area")).define("viewof panel_area", ["text"], _panel_area);
  main.variable(observer("panel_area")).define("panel_area", ["Generators", "viewof panel_area"], (G, _) => G.input(_));
  main.variable(observer("viewof panel_efficiency")).define("viewof panel_efficiency", ["text"], _panel_efficiency);
  main.variable(observer("panel_efficiency")).define("panel_efficiency", ["Generators", "viewof panel_efficiency"], (G, _) => G.input(_));
  main.variable(observer("desc_panel_area")).define("desc_panel_area", ["md","panel_area_total"], _desc_panel_area);
  main.variable(observer("desc_energy")).define("desc_energy", ["md"], _desc_energy);
  main.variable(observer("desc_summary_energy_production")).define("desc_summary_energy_production", ["md","summary_energy_production"], _desc_summary_energy_production);
  main.variable(observer("desc_energy_us_average")).define("desc_energy_us_average", ["md"], _desc_energy_us_average);
  main.variable(observer("desc_cost")).define("desc_cost", ["md"], _desc_cost);
  main.variable(observer("viewof energy_price")).define("viewof energy_price", ["text"], _energy_price);
  main.variable(observer("energy_price")).define("energy_price", ["Generators", "viewof energy_price"], (G, _) => G.input(_));
  main.variable(observer("desc_summary_energy_production_dollars")).define("desc_summary_energy_production_dollars", ["md","summary_energy_production_dollars"], _desc_summary_energy_production_dollars);
  main.variable(observer()).define(["md"], _20);
  const child1 = runtime.module(define1);
  main.import("coordinates", child1);
  main.import("slider", child1);
  main.import("text", child1);
  main.import("worldMapCoordinates", child1);
  const child2 = runtime.module(define2);
  main.import("bind", child2);
  main.import("View", child2);
  main.variable(observer("ol")).define("ol", ["require","html"], _ol);
  main.variable(observer("map")).define("map", ["ol","html","lon","lat"], _map);
  main.variable(observer("lat_def")).define("lat_def", _lat_def);
  main.variable(observer("lon_def")).define("lon_def", _lon_def);
  main.variable(observer("lat")).define("lat", ["lonlat"], _lat);
  main.variable(observer("lon")).define("lon", ["lonlat"], _lon);
  main.variable(observer("url")).define("url", ["query_year","lat","lon"], _url);
  main.variable(observer("bad_url")).define("bad_url", _bad_url);
  main.variable(observer("cors_proxy")).define("cors_proxy", _cors_proxy);
  main.variable(observer("response_json")).define("response_json", ["cors_proxy","url"], _response_json);
  main.variable(observer("use_cached_response")).define("use_cached_response", ["response_json"], _use_cached_response);
  main.variable(observer("default_response_2020_south_texas")).define("default_response_2020_south_texas", _default_response_2020_south_texas);
  main.variable(observer("solar_irradiance_daily")).define("solar_irradiance_daily", ["use_cached_response","response_json","default_response_2020_south_texas"], _solar_irradiance_daily);
  main.variable(observer("solar_irradiance_daily_filtered")).define("solar_irradiance_daily_filtered", ["solar_irradiance_daily"], _solar_irradiance_daily_filtered);
  main.variable(observer("solar_irradiance_average")).define("solar_irradiance_average", ["solar_irradiance_daily_filtered"], _solar_irradiance_average);
  main.variable(observer("panel_area_total")).define("panel_area_total", ["panel_area","panel_count"], _panel_area_total);
  main.variable(observer("daily_energy")).define("daily_energy", ["solar_irradiance_average","panel_area_total","panel_efficiency"], _daily_energy);
  main.variable(observer("yearly_energy")).define("yearly_energy", ["daily_energy"], _yearly_energy);
  main.variable(observer("daily_energy_dollars")).define("daily_energy_dollars", ["daily_energy","energy_price"], _daily_energy_dollars);
  main.variable(observer("yearly_energy_dollars")).define("yearly_energy_dollars", ["daily_energy_dollars"], _yearly_energy_dollars);
  main.variable(observer("current_year")).define("current_year", _current_year);
  main.variable(observer("query_year")).define("query_year", ["current_year"], _query_year);
  main.variable(observer("cached_year")).define("cached_year", _cached_year);
  main.variable(observer("summary_cached_disclaimer")).define("summary_cached_disclaimer", ["use_cached_response","query_year","cached_year"], _summary_cached_disclaimer);
  main.variable(observer("summary_irradiation")).define("summary_irradiation", ["use_cached_response","cached_year","query_year","lon","lat","solar_irradiance_average"], _summary_irradiation);
  main.variable(observer("summary_energy_production")).define("summary_energy_production", ["daily_energy","yearly_energy"], _summary_energy_production);
  main.variable(observer("summary_energy_production_dollars")).define("summary_energy_production_dollars", ["yearly_energy","energy_price","daily_energy_dollars","yearly_energy_dollars"], _summary_energy_production_dollars);
  return main;
}
