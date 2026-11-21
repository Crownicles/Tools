# Référence des données d'un event

## Champs d'une issue (`Core/resources/events/<id>.json`)

- `requirements` : conditions pour que l'issue puisse tomber (voir plus bas). Sans `requirements`, l'issue est toujours possible.
- `health` (vie, négatif = blessure), `money` (argent), `lostTime` (minutes perdues), `karma` (entier, voir plus bas), `effect` (altération), `randomItem` (`{}` = objet au hasard ; `{"rarity": {"min": 3}}` ou `{"category": 0}` possibles), `energy`, `gems`, `tokens`, `bonusExperience`, `bonusPoints`, `randomPet`, `givePet`, `oneshot`, `nextEvent`, `mapTypesDestination` / `mapTypesExcludeDestination` (types des cartes voisines, voir `neighbours[].type` dans ton input), `mapLink`, `forceStayInCity` / `forceLeaveCity` (villes seulement), `tags` (garde ceux de l'original), `condition` (n'existe qu'avec `canAcceptPet` : garde-le s'il y est).

## Altérations (`effect`) et leur durée en minutes

`occupied` (durée = `lostTime`), `sleeping` 180, `drunk` 240, `freezing` 60, `feetHurt` 110, `hurt` 300, `sick` 330, `jailed` 1440, `injured` 660, `starving` 50, `confounded` 40, `scared` 15, `lost` 270, `fished` 5, `working` 75, `burning` 25. Utilise celles de l'original en priorité.

## Conditions (`requirements`)

Plages `{"min": x, "max": y}` (bornes incluses, l'une ou l'autre facultative) : `level`, `karma`, `health` (vie actuelle), `attack`, `defense`, `speed` (statistiques avec l'équipement). Listes : `validClassIds`, `validPetTypeIds` (le joueur doit avoir un familier de ce type). `petRarity` : plage sur la rareté du familier (il en faut un). `campaignCurrentMissionId` : n'y touche pas.

### Seuils calés sur les joueurs réguliers en production

Mesuré le 21/11/2026 sur les **130 joueurs réguliers** (au moins 3 jours de jeu sur les 14 derniers), stats calculées par le code du jeu, équipement et potion compris. Médianes : niveau 96, attaque 440, défense 340, vitesse 135.

**L'échelle est exigeante** : être dans le premier quart, c'est juste « correct » ; « fort » veut dire vraiment fort (premier dixième) ; « exceptionnel », les tout meilleurs. Choisis le mot du texte en fonction du seuil, et inversement.

| Le texte décrit… | niveau | attaque | défense | vitesse | joueurs réguliers |
|---|---|---|---|---|---|
| un débutant | `max` 30 | `max` 90 | `max` 60 | `max` 10 | 10 % |
| un joueur encore faible | `max` 55 | `max` 230 | `max` 180 | `max` 40 | 25 % |
| un joueur correct, pas nul | `min` 120 | `min` 600 | `min` 520 | `min` 350 | 25 % |
| un joueur fort, un vétéran | `min` 130 | `min` 700 | `min` 740 | `min` 500 | 10 % |
| un joueur exceptionnel, une légende | `min` 140 | `min` 780 | `min` 860 | `min` 560 | 5 % |

Un niveau 60 est encore le début du jeu pour un joueur régulier : ne le décris jamais comme expérimenté.

Autres repères :
- **Beaucoup de joueurs sont encore Recrue** (classe 0). Une condition sur une seule classe avancée concerne 1 à 3 % des joueurs : c'est voulu, des issues rares rendent l'event plus riche.
- **51 % des joueurs ont un familier.** Un type précis (Chien, Perroquet, Singe…) concerne 0 à 2 % des joueurs : c'est voulu aussi, une part de joueurs concernés très variable d'une issue à l'autre est une bonne chose. Les plus fréquents chez les joueurs : Fantôme (100), Tigre (56), Vampire (101), Jack-o'-lantern (99), Licorne (63), Stitch (66), Bœuf (8), Lion (57), Caniche (2), Porc (9), T-Rex (65), Rongeur (5), Alien (70), Chat noir (4), Chauve-souris (27), Loup (28), Serpent (15), Léopard (60).
- **Le karma n'existe pas encore en production : tout le monde partira de 0.** Une issue rapporte en général 1 à 5 points. Les seuils de karma restent ceux des events déjà réécrits (`min` 0, 50, 80 ou 100, `max` -30 ou -50) : ces issues se débloquent avec le temps.
- Les seuils de niveau et de statistiques suivent l'échelle ci-dessus et correspondent au texte. Le script `reach.py` (hors dépôt) donne, pour un event, la part des joueurs réguliers qui peuvent obtenir chaque issue.

## Karma

Il commence à 0 et n'est pas borné. Une issue le change de -1 à -5 pour une petite faute, de -10 à -20 pour un acte grave, de +1 à +5 pour un geste correct, de +8 à +15 pour un acte vraiment généreux. Une issue conditionnée par le karma montre comment le monde traite le joueur selon sa réputation, sans la nommer : on le reconnaît, on se méfie de lui, on lui fait confiance.

## Classes (`validClassIds`)

0 Recrue, 1 Combattant, 2 Soldat, 3 Fantassin, 4 Ganté, 5 Casqué, 6 Maillé, 7 Tank, 8 Lanceur de pierre, 9 Frondeur, 10 Archer, 11 Canonnier, 12 Écuyer, 13 Cavalier, 14 Piquier, 15 Chevalier, 16 Paladin, 17 Vétéran, 18 Fantassin puissant, 19 Tank impénétrable, 20 Canonnier redoutable, 21 Chevalier valeureux, 22 Paladin lumineux, 23 Vétéran chevronné, 24 Mage mystique

## Familiers (`validPetTypeIds`, rareté de 1 à 8)

Voir `pets.json` (id, nom, rareté). Exemples parlants : 1 Chien, 3 Chat, 15 Serpent, 20 Renard, 24 Singe, 28 Loup, 54 Perroquet, 58 Aigle, 64 Dragon, 65 T-Rex, 84 Diplodocus, 91 Gorille, 95 Corbeau.

## Exemple tiré de l'event 19 (réécrit) : la possibilité `butch` (dépecer un renard mort)

```json
{
 "outcomes": {
  "0": {
   "requirements": {
    "karma": {
     "max": -50
    }
   },
   "money": 520,
   "karma": -5,
   "effect": "occupied",
   "lostTime": 40
  },
  "1": {
   "requirements": {
    "attack": {
     "min": 250
    }
   },
   "money": 360,
   "karma": -5,
   "effect": "occupied",
   "lostTime": 25
  },
  "2": {
   "requirements": {
    "validPetTypeIds": [
     1
    ]
   },
   "money": 180,
   "karma": -1,
   "effect": "occupied",
   "lostTime": 45
  },
  "3": {
   "requirements": {
    "validPetTypeIds": [
     20
    ]
   },
   "karma": -6,
   "effect": "sick",
   "health": -10
  },
  "4": {
   "requirements": {
    "karma": {
     "min": 80
    }
   },
   "karma": 3,
   "effect": "occupied",
   "lostTime": 35
  },
  "5": {
   "requirements": {
    "level": {
     "max": 25
    }
   },
   "effect": "sick",
   "karma": -5,
   "health": -18,
   "lostTime": 30
  },
  "6": {
   "requirements": {
    "attack": {
     "min": 320
    },
    "defense": {
     "min": 260
    }
   },
   "randomItem": {},
   "money": 240,
   "karma": -2,
   "effect": "occupied",
   "lostTime": 30
  },
  "7": {
   "money": 140,
   "effect": "occupied",
   "karma": -5,
   "lostTime": 50
  },
  "8": {
   "requirements": {
    "level": {
     "min": 100
    }
   },
   "money": 480,
   "karma": -1,
   "effect": "occupied",
   "lostTime": 30
  },
  "9": {
   "requirements": {
    "level": {
     "max": 50
    }
   },
   "karma": -5,
   "effect": "occupied",
   "lostTime": 25
  }
 }
}
```

L'issue `7` n'a pas de condition : c'est elle qui garantit qu'il reste toujours une issue possible.
