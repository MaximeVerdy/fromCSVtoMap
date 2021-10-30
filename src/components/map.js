// import du frameword et des libraries
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import Geocode from "react-geocode";
import APIKEY from '../someKeys.js'
import ReactFileReader from 'react-file-reader';

// import du Style CSS
import '../App.css';

//import des images
import iconAccelerate from '../images/accelerate.png'
import iconUpload from '../images/upload.png'
import iconDecrease from '../images/decrease.png'
import iconPlay from '../images/play.png'



// composant fonctionnel React
const Map = () => {

  // import de la library de conversion de CSV en tableau JS
  const { convertCSVToArray } = require('convert-csv-to-array');

  // liste des hooks d'états utilisés dans ce composant React
  const [sales, setSales] = useState([]);
  const [salesDeployment, setSalesDeployment] = useState([])
  const [startDeployment, setStartDeployment] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [map, setMap] = useState(null);
  const [geocodingProblem, setGeocodingProblem] = useState(false)
  const [dateOnMap, setDateOnMap] = useState('')
  const [salesCounter, setSalesCounter] = useState([])
  const [countriesArray, setCountriesArray] = useState([])
  const [salesSum, setSalesSum] = useState(0)


  // regex pattern utilisé pour ré-écrire la date de vente initiale dans un format de date reconnu en JS. ex: On passera de 24/12/2020 à 2020-12-24
  var dateFormatPattern = /(\d{2})\/(\d{2})\/(\d{4})/;

  // FONCTION GERANT L'UPLOAD DU CSV ET LA CONSERSION EN TALBEAU JS EXPLOITABLE
  const handleUploading = async (files) => {

    setSalesDeployment([])
    setPlaySpeed(1)
    setCountriesArray([])
    setSalesCounter([])
    setSalesSum(0)
    setGeocodingProblem(false)
    setSales([])
    setDateOnMap('')

    //upload des données du fichier CSV
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataFromCSV = reader.result + `\n "zipCode"; "country" ; "date";`

      // conversion des data du CSV en tableau JS
      var salesInFunctionScope = convertCSVToArray(dataFromCSV, {
        // options de conversion
        type: 'array',
        header: false,
        separator: ';'
      })

      // ajout au tableau salesInFunctionScope des valeurs exploitables
      salesInFunctionScope.map((element) => {
        element[3] = ""
        // conversion du string date au format JS Date
        var saleDate = new Date(element[2].slice(1, 20).slice(0, -1).toString().replace(dateFormatPattern, '$3-$2-$1'))
        element[4] = { "dateOfSale": saleDate }
      })

      var ordering = () => {
        return new Promise(function (resolve, reject) {
          resolve(salesInFunctionScope.sort((a, b) => a[4].dateOfSale - b[4].dateOfSale));
        })
      }

      ordering()
        .then((sortedArray) => {
          sortedArray.map((element) => (
            element[5] = { 'splitTime': element[4].dateOfSale - sortedArray[0][4].dateOfSale }
          ));
          return sortedArray
        })
        .then(function (fullArray) {
          {
            // utilisation d'un hook d'état pour sortir les valeurs du tableau du scope de la fonction handleUploading
            setSales(fullArray);
          }
        })

    }
    reader.readAsText(files[0]);
  };


  // fonction déclanchant la lecture de l'animation
  const handlePlay = () => {
    setSalesDeployment([])
    setStartDeployment(startDeployment + 1)
    setCountriesArray([])
    setSalesCounter([])
    setSalesSum(0)
    setGeocodingProblem(false)
    setDateOnMap('')
  };

  // quand on clique sur PLAY, le déploiement des markers se fait progressivement sur la carte 
  useEffect(() => {

    // fonction d'ajout d'une vente à l'array qui est mappée ensuite dans le composant Marker
    var moreSales = (sale) => {
      setDateOnMap(sale[2].slice(1, 20).slice(0, -1).toString())

      var justPostalCode = sale[0].slice(1, 20).slice(0, -1).toString()
      var justCountry = sale[1].slice(1, 20).slice(0, -1).toString()

      if(justCountry === 'Corse'){
        var address = `${justPostalCode}, France`
      } else {
        var address = `${justPostalCode}, ${justCountry}`
      }

      if (countriesArray.length <= sales.length) {
        // ajout en array des pays à chaque fois qu'une vente est faite. Ce sera utilisé en ligne 159, là où on crée un compteur de ventes par pays
        if(justCountry === 'Corse'){
          setCountriesArray(countriesArray => [...countriesArray, 'France'])
        } else {
          setCountriesArray(countriesArray => [...countriesArray, justCountry])
        }
      }

      // geolocation avec GeoCode à partir d'une adresses exactes
      Geocode.setApiKey(APIKEY.APIKEY)
      Geocode.fromAddress(address)
        .then(
          (response) => {
            sale[3] = { "position": response.results[0].geometry.location }
          },
          (error) => { console.error(error) }
        ).then(
          () => {
            setSalesDeployment((salesDeployment) => [...salesDeployment, sale]);
          }
        )
    }

    if (sales.length > 0) {
      sales.forEach((element) => {
        // appel de la fonction moreSales avec un minuteur dépendant de l'écart de temps entre 2 ventes
        setTimeout(() => {
          moreSales(element);
        }, (Math.round(element[5].splitTime / (2678400 * playSpeed)) + 1))
      });
    }

  }, [startDeployment, playSpeed])


  useEffect(() => {

    // création d'un compteur de ventes par pays
    countriesArray.forEach(country => {

      var matchIncountriesArray = countriesArray.filter(element => element.includes(country))
      var matchInsalesCounter = salesCounter.filter(element => element.includes(country))
      var index = salesCounter.indexOf(matchInsalesCounter[0])

      // si c'est la 1ère vente dans ce pays
      if (matchInsalesCounter.length === 0) {
        setSalesSum(salesSum + 1)
        setSalesCounter(salesCounter => [...salesCounter, `${country} : 1`])

        // sinon recherche de la place du pays par odre chronologique d'apparition et modification du nombre de ventes associé
      } else {
        var allInfos = `${country} : ${matchIncountriesArray.length}`

        let changeInArray = [
          ...salesCounter.slice(0, index),
          allInfos,
          ...salesCounter.slice(index + 1)
        ]
        setSalesSum(salesSum + 1)
        setSalesCounter(changeInArray)
      }

    })
  }, [salesDeployment])

  // fonction de diminution de la vitesse de lecture 
  const handleDecrease = () => {
    setPlaySpeed(playSpeed / 1.2)
  };

  // fonction l'accélération de la vitesse de lecture 
  const handleAccelerate = () => {
    setPlaySpeed(playSpeed * 1.2)
  };

  // paramétrage de la library @react-google-maps/api
  const onLoad = useCallback((map) => setMap(map), []);

  useEffect(() => {
    // fixation des limites de la cartes quand il y a des markers
    if (
      map && salesDeployment.length > 0 && ((salesDeployment.at(-1)[3].position) !== undefined)
    ) {

      const bounds = new window.google.maps.LatLngBounds();

      // fixation des limites de la carte pour le 1er marker. On ne veut pas un trop gros zoom, juste arbitrairement
      bounds.extend(
        {
          lat: salesDeployment[0][3].position.lat + 0.5,
          lng: salesDeployment[0][3].position.lng,
        });

      bounds.extend(
        {
          lat: salesDeployment[0][3].position.lat - 0.5,
          lng: salesDeployment[0][3].position.lng,
        });

      salesDeployment.map(marker => {
        if (marker[3].position !== undefined) {
          bounds.extend({
            lat: marker[3].position.lat,
            lng: marker[3].position.lng,
          });
        } else {
          setGeocodingProblem(true)
        }
      });
      map.fitBounds(bounds);

      // fixation des limites initiales de la carte
    } else if (map) {
      const bounds = new window.google.maps.LatLngBounds();

      bounds.extend(
        {
          lat: 44,
          lng: 28,
        });
      bounds.extend({
        lat: 39,
        lng: -120,
      })
      bounds.extend(
        {
          lat: 36,
          lng: 120,
        });

      map.fitBounds(bounds);
    }
  }, [map, salesDeployment]);

  // message affiché en cas de problème
  var errorGeocoding
  if (geocodingProblem === true) {
    errorGeocoding = < div className="errorMessage" >
      <p>PROBLEME AVEC AU MOINS UNE POSITION GPS </p>
      <p>C'est probablement lié à l'API de geocoding de Google.</p>
      <p>Si elle a reçu trop de requêtes, elle ne répondra plus... ☹</p>
    </div >
  }

  // GOOGLE MAPS STYLE
  const containerStyle = {
    width: '100vw',
    height: '100vh'
  };


  return (

    <div>

      {errorGeocoding}

      <div className="commands">
        <div
          className="rows"
        >
          <ReactFileReader
            fileTypes={[".csv"]}
            multipleFiles={false}
            handleFiles={handleUploading}>
            <img
              className="buttons"
              src={iconUpload}
              alt="upload"
            />
          </ReactFileReader>
          <img
            className="buttons"
            src={iconPlay}
            onClick={handlePlay}
            alt="play"
          />

        </div>
        <div
          className="rows"
        >
          <img
            className="buttons"
            src={iconDecrease}
            onClick={handleDecrease}
            alt="decrease"
          />
          <img
            className="buttons"
            src={iconAccelerate}
            onClick={handleAccelerate}
            alt="accelerate"
          />
        </div>

        {dateOnMap !== "" &&
          <p className="salesByCountry" style={{ paddingBottom: "10px" }}>
            {dateOnMap}
          </p>
        }
        {salesCounter.length > 0 &&
          <p className="sales">Ventes : {salesSum}</p>

        }
        {salesCounter.length > 0 &&
          salesCounter.map(country =>
            <p className="salesByCountry">{country}</p>
          )
        }
      </div>

      <LoadScript
        googleMapsApiKey={APIKEY.APIKEY}
      >

        <GoogleMap
          mapContainerStyle={containerStyle}
          onLoad={onLoad}
        >

          {salesDeployment.length > 0 &&
            salesDeployment.map((element) => (

              <Marker
                position={element[3].position}
                opacity={0.8}
                icon={{
                  path: "M17.671,13.945l0.003,0.002l1.708-7.687l-0.008-0.002c0.008-0.033,0.021-0.065,0.021-0.102c0-0.236-0.191-0.428-0.427-0.428H5.276L4.67,3.472L4.665,3.473c-0.053-0.175-0.21-0.306-0.403-0.306H1.032c-0.236,0-0.427,0.191-0.427,0.427c0,0.236,0.191,0.428,0.427,0.428h2.902l2.667,9.945l0,0c0.037,0.119,0.125,0.217,0.239,0.268c-0.16,0.26-0.257,0.562-0.257,0.891c0,0.943,0.765,1.707,1.708,1.707S10,16.068,10,15.125c0-0.312-0.09-0.602-0.237-0.855h4.744c-0.146,0.254-0.237,0.543-0.237,0.855c0,0.943,0.766,1.707,1.708,1.707c0.944,0,1.709-0.764,1.709-1.707c0-0.328-0.097-0.631-0.257-0.891C17.55,14.182,17.639,14.074,17.671,13.945 M15.934,6.583h2.502l-0.38,1.709h-2.312L15.934,6.583zM5.505,6.583h2.832l0.189,1.709H5.963L5.505,6.583z M6.65,10.854L6.192,9.146h2.429l0.19,1.708H6.65z M6.879,11.707h2.027l0.189,1.709H7.338L6.879,11.707z M8.292,15.979c-0.472,0-0.854-0.383-0.854-0.854c0-0.473,0.382-0.855,0.854-0.855s0.854,0.383,0.854,0.855C9.146,15.596,8.763,15.979,8.292,15.979 M11.708,13.416H9.955l-0.189-1.709h1.943V13.416z M11.708,10.854H9.67L9.48,9.146h2.228V10.854z M11.708,8.292H9.386l-0.19-1.709h2.512V8.292z M14.315,13.416h-1.753v-1.709h1.942L14.315,13.416zM14.6,10.854h-2.037V9.146h2.227L14.6,10.854z M14.884,8.292h-2.321V6.583h2.512L14.884,8.292z M15.978,15.979c-0.471,0-0.854-0.383-0.854-0.854c0-0.473,0.383-0.855,0.854-0.855c0.473,0,0.854,0.383,0.854,0.855C16.832,15.596,16.45,15.979,15.978,15.979 M16.917,13.416h-1.743l0.189-1.709h1.934L16.917,13.416z M15.458,10.854l0.19-1.708h2.218l-0.38,1.708H15.458z",
                  fillColor: "black",
                  fillOpacity: 3,
                  scale: 0.9,
                  strokeColor: "red",
                  strokeWeight: 0.8,
                }}
              >
              </Marker>

            ))}

        </GoogleMap>
      </LoadScript>

    </div >
  );
}

export default React.memo(Map);