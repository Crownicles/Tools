# Le royaume en direct

Génère le tableau de bord Grafana « 🗺️ Le royaume en direct » (dossier 👤 Joueurs, uid `royaume-en-direct`) : tous les héros du royaume sur la vraie carte du jeu, à l'instant de la fin de la période choisie.

- **Héros en route** : un point rouge par héros qui marche, placé le long de sa route selon le temps écoulé depuis son départ et la durée du trajet. Le survol donne son lieu de départ, sa destination, sa progression et son heure d'arrivée prévue.
- **Lieux** : une bulle par lieu, qui grossit avec le nombre de héros arrivés et pas encore repartis.
- **Routes** : les routes empruntées pendant la période, plus épaisses et plus rouges avec les passages.
- **Au large / Maison hantée** : les héros sur les îles ou dans la maison hantée, qui ont leurs propres cartes.

Seuls les héros partis dans les 24 heures précédant la fin de la période sont affichés. Les autres sont considérés comme endormis.

## Remonter le temps

La carte suit la fin de la période du sélecteur de temps. Pour revoir un moment passé, on sélectionne une zone du graphique des départs à la souris, ou on décale la période avec les flèches du sélecteur. La carte se rafraîchit toutes les 30 secondes en direct.

## Générer et déployer

```bash
python3 build.py                                  # écrit dashboard.json
GRAFANA_URL=http://grafana GRAFANA_TOKEN=… python3 build.py --deploy
python3 build.py --tiles /tmp/tiles               # redécoupe la carte en tuiles
```

Le script lit :

- les coordonnées des lieux et du milieu de chaque route dans `../map-builder/mapCoords/main_continent.json` ;
- la durée de chaque trajet dans `Core/resources/mapLinks` du dépôt Crownicles ;
- le nom des lieux dans `Lang/fr/models.json` du dépôt Crownicles.

Le dépôt Crownicles est cherché à côté de Tools, ou dans `CROWNICLES_REPO`. Les données sont recopiées dans le SQL, car la base de logs ne connaît que des identifiants. Il faut donc relancer `--deploy` quand un lieu, une route ou une durée change.

## La carte

Geomap ne sait afficher qu'un fond en tuiles. La carte `../Ressources/map_fr.jpg` (8192 × 5488) est donc traitée comme un faux monde Web Mercator dont le zoom 5 est la carte elle-même, ce qui convertit exactement un pixel de la carte en latitude et longitude. Les tuiles WebP sont servies par le site, dans `Website/public/ressources/kingdom/tiles/{z}/{x}/{y}.webp`. Il faut les régénérer et les republier si la carte change.
