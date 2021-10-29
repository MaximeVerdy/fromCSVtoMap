### from CSV to map est une application React
  
* uploadez un fichier CVS avec dates et adresses (ex : une chronologie de ventes)
* l'app convertit les données en tableau JS
* les adresses sont converties en coordonnées GPS
* de ce nouveau tableau, les markers correspondant aux ventes s'affichent chronologiquement sous forme de caddies sur la carte Google maps
* un compteur affichent l'augmentation du nombre de ventes par pays au fur et à mesure du déploiement des markers


#### Fonctionnalités et technologies utilisées : 

* Le Frontend a été bootstrappé avec Create React App
* l'upload du fichier se fait grâce à la library react-file-reader
* la conversion du CSV se fait grâce à la library convert-csv-to-array 
* le geocoding (conversion d'adresses en coordonnées GPS) se fait grâce à la library react-geocode
* l'affichage sur la carte Google Maps se fait grâce à la library @react-google-maps/api
