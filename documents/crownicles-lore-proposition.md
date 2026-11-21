# Crownicles — Proposition de bible du lore (v0.5)

> Cette proposition part du lore existant (branche `develop`, commit `d23ffe883`, visualisable dans l'outil *Graphe du lore*). Il n'y a **pas de religion structurée**, seulement des références légères.
>
> **Changements depuis la v0.1.** Le monde est conçu pour un jeu **infini et répétitif**. L'arc en quatre actes, qui faisait évoluer l'état du monde, est abandonné. À la place, le monde est un **présent permanent** : les quêtes font progresser **ce que le joueur sait**, jamais l'état du monde. Ajout de la ligne de quêtes phare, **le Grand Livre de Liard** (les créances), et de quatre autres lignes infinies.
>
> **Ajouts de la v0.2.1.** Une **quête infinie à horizon fuyant**, qui affiche `1/8` puis voit son total grandir par cahiers sans jamais pouvoir être terminée. Des **big events débloqués par l'étape de quête**. Une **spécification technique** branchée sur le système de quêtes et de déclencheurs de `develop` (section 15).
>
> **Ajouts de la v0.3.** La reprise de la branche du karma (`outcomerequirements`) dans la spécification (section 15.4) et un **plan de mise en œuvre par petits lots** (section 16), qui évite de réécrire tous les events.
>
> **Ajouts de la v0.4.** L'**annexe A, canon des lieux**, générée depuis `develop` : tout ce que le jeu dit déjà de chaque lieu. La géographie (section 5) est réalignée dessus et sépare ce qui est canon de ce que la proposition ajoute.
>
> **Ajouts de la v0.5.** Le guide de style (section 14) intègre les retours de relecture des events réécrits : vocabulaire simple, phrases courtes, décor limité à l'action, pas de montant, longueur d'introduction nuancée, et une échelle des seuils calée sur les joueurs réguliers en production. Ces règles sont aussi rassemblées dans le skill `write-event-texts` du dépôt Crownicles (`.github/skills/write-event-texts/SKILL.md`), à suivre pour tout texte d'event.

---

## 0. Intention

### Ce qu'on corrige dans le lore actuel

| Constat | Problème |
|---|---|
| Le Kyutisme (Askeriel, Orthgard, Fenrir, Iatneh, Y'ahnor) n'apparaît que dans un event et deux lignes du staff | Panthéon générique qui n'explique rien du monde |
| L'Église pendeuse, les prêcheurs et la secte démoniaque de Boug-Coton | Trois institutions religieuses sans lien entre elles |
| Le staff présenté en dieux ou en prêtres | Contradictions, immersion brisée |
| La princesse est un trophée sans visage | L'enjeu central est la figure la plus vide du lore |
| Les îles, les boss, les Portes, le Mont Célestrum, l'Oracle et le Talisman existent sans histoire commune | De très bons morceaux, mais aucun lien entre eux |
| Beaucoup de rôles uniques sont anonymes | On s'attache à un nom, pas à « un marchand » |
| Le jeu n'a pas de colonne vertébrale de quêtes | Rien ne donne un but au voyage au-delà du score |

### Les piliers

1. **Un présent permanent.** Le monde est une situation figée en tension, pas une histoire qui avance (section 1).
2. **Pas de religion structurée.** Le merveilleux vient de l'Histoire (une civilisation disparue et sa science, la Résonance), de la nature et des hommes. Les traces de croyance restent des expressions et des superstitions de village.
3. **De l'humour en surface, de la gravité en dessous.** Maurice le crabe et la SAFAC restent, mais chaque blague peut cacher un fil.
4. **Le lore explique les mécaniques**, y compris la répétition : pourquoi on recroise Talvar cent fois, pourquoi les boss reviennent, pourquoi le Concours ne finit jamais.
5. **Chaque personnage nommé a une situation, un secret et des liens.**
6. **Écrire des machines, pas des chapitres.** On écrit des modèles réutilisables plutôt que du contenu jetable.

---

## 1. La règle d'or : un présent permanent

Un joueur verra le même event des dizaines, voire des centaines de fois, dans n'importe quel ordre. Le lore doit donc tenir à la centième lecture. Huit règles en découlent.

### R1 · Des situations, pas des intrigues
Chaque personnage et chaque faction est défini par une **tension qui ne se résout jamais**. Moltiar déteste les familiers, Talvar les adore, et ils sont frères : c'est une situation, elle produit une infinité de scènes et aucune n'a besoin d'être « la dernière ».

### R2 · Les quêtes révèlent, elles ne réparent pas
Une quête peut apprendre au joueur que la guide du château est la princesse, que Moltiar a brisé le lien avec sa propre bête, ou que le Trésorier finance les conspirateurs. Le monde, lui, ne bouge pas : la guide continue d'accueillir les nouveaux, Moltiar grogne toujours, le Trésorier vous salue toujours. **Les events répétables restent vrais.** Le joueur les relit simplement autrement, ce qui crée de l'ironie dramatique. Cela ne coûte aucune réécriture.

> Si une quête réconcilie deux personnages, la scène finale le reconnaît : « Moltiar vous serre la main. Demain, il grognera de nouveau ; il ne sait pas faire autrement. »

### R3 · L'aléatoire est un trait de caractère
Les events actuels ont déjà des issues aléatoires : Price vous escorte ou vous vole, le chevalier noir vous offre de l'eau ou vous renverse, la sorcière réussit ou rate sa potion. Le lore doit faire de cette variance une **personnalité** :
- Price est un agent double, tiraillé ;
- le Chevalier sans Blason est un héritier déchiré ;
- la Vieille Margot est une alchimiste brisée.

Ainsi, la contradiction entre deux tirages devient de la caractérisation.

### R4 · Aucun event répétable ne présuppose un ordre ni ne ferme une porte
Pas de « comme la dernière fois », pas de « désormais », pas de mort définitive d'un personnage récurrent. Les seules informations sûres sont les faits stables du lore.

### R5 · Une échelle humaine dans le pool répétable
Un event qu'on revoit chaque semaine ne peut pas contenir d'adoubement par le roi ni de sauvetage personnel de la princesse. Les grandes choses arrivent au monde, pas au joueur. Le joueur aide, les institutions concluent : « la Garde royale embarque le suspect ».

### R6 · Le monde bouge par les données, pas par l'écriture
Ce qui change réellement (le top de la semaine, l'île qui affleure, le cours de l'argent du roi, la bénédiction active, la saison) est **injecté dans des textes stables**. Le monde paraît vivant sans qu'on écrive de nouveau texte (section 10).

### R7 · Les boucles sont dans le lore
- **Les îles affleurent chaque semaine** parce qu'elles dérivent au rythme des marées.
- **Les Colosses ne meurent pas.** On les repousse, on les rendort. L'Archiviste compte des victoires, pas des morts. Il faut donc corriger « fait taire à jamais le Léviathan ».
- **Le Concours est perpétuel.** Chaque saison, un champion est désigné, et la princesse le refuse (section 2).
- **Les marchands itinérants reviennent** parce que c'est leur tournée.
- **Les Échos se rejouent en boucle,** par définition.
- **Le Grand Livre se remplit tout seul** (section 8.1).

### R8 · Écrire des machines, pas des chapitres
L'effort d'écriture va en priorité :
1. aux **pools de variantes** (events, petits events, rumeurs, conseils) ;
2. aux **modèles de quêtes infinies** (le Livre, le Courrier…) ;
3. et seulement ensuite aux **révélations**, courtes, finies, vues une fois.

Le contenu « jetable » est réduit à des fragments courts et réutilisables (section 12).

> **Le test de la 100e lecture.** Avant d'ajouter un texte répétable, il faut se demander si, lu pour la 100e fois et après n'importe quel autre event, il est encore vrai et encore agréable.

---

## 2. Le cœur du monde

La **Contrée** est un royaume bâti sur les ruines des **Célestrins**, une civilisation disparue qui maîtrisait la **Résonance** : l'art de faire vibrer la matière pour en tirer de l'énergie. En voulant enchaîner les **Colosses**, des créatures primordiales, les Célestrins ont provoqué **la Brisure**. Des pans de leur territoire ont été arrachés et dérivent depuis dans la brume sous le nom d'**Îles Errantes**. Les Colosses y dorment d'un sommeil agité.

Après la Guerre des Héritiers, qui a rasé **Ville Forte**, la reine **Ermengarde** a scellé la **Charte de la Chronique** : la couronne ne se transmet plus par le sang mais par les **hauts faits**, consignés dans la **Grande Chronique**. Le champion désigné, l'**Élu**, épouse l'héritier ou l'héritière de la lignée de la Charte.

Ce que presque personne ne sait : la **Couronne** est un artefact célestrin. Tant qu'un porteur fort la tient, les îles restent au large. Ermengarde n'a pas inventé le Concours par idéal, mais parce qu'il fallait toujours trouver le plus fort.

### La situation permanente (le « tableau » du jeu)

- **Le roi Aubéric** vieillit. La Couronne lui pèse et, du coup, les îles affleurent chaque semaine près des côtes et y déversent leurs monstres. Le roi finance les traversées et paie les aventuriers pour repousser les Colosses.
- **Le Concours est ouvert, et il ne se ferme jamais.** À chaque fin de saison, la Chronique désigne un champion. **La princesse Mélisende le refuse,** comme elle a refusé tous les précédents : elle veut un égal, pas un vainqueur. Le roi soupire, le Bureau du Concours ouvre un nouveau volume, et tout recommence. C'est la justification de la remise à zéro des saisons, et un running gag sans fin pour les events (« la princesse a encore refusé le champion de la saison ! »).
- **La Main Grise** complote sans jamais réussir ni être démantelée : un tunnel ici, une rumeur là, une embuscade ailleurs.
- **Les seigneurs se querellent,** les marchands tournent, les nains se disputent, les îles reviennent.

> C'est le sens du titre : **Crown-icles**, les chroniques de la couronne, dont chaque saison est un volume.

---

## 3. Chronologie (le passé est fixe ; le présent est un tableau)

| Époque | Événements | Traces dans le jeu |
|---|---|---|
| Avant l'Histoire | Les Colosses façonnent mers et montagnes ; le Léviathan « sommeille depuis l'aube des temps » | Descriptions des boss |
| Âge célestrin (≈ 1 500 ans) | Célestrum, la capitale au sommet du mont. Les Portes, le Canal Lavique, la Cave des murmures. Les premiers dresseurs forgent le Talisman d'Ancrage. Les scribes célestrins tiennent des **registres résonants**, dont le Grand Livre. | Mont Célestrum, Portes sacrées, Canal Lavique, Gardien céleste, Liane céleste |
| La Brisure (≈ 1 200 ans) | La tentative d'enchaîner les Colosses échoue. Trois pans du territoire deviennent les Îles Errantes, et un village célestrin gèle en une nuit. | Village dévasté, Village en ruines |
| Temps des Rois-Guerriers | Des seigneurs de guerre se partagent les restes ; leurs tombeaux parsèment le désert | Vallée des Rois, La Dune |
| Guerre des Héritiers (≈ 300 ans) | Trois branches d'une dynastie s'entretuent ; Ville Forte est rasée | Ville Forte, Grande Rue |
| La Charte (≈ 290 ans) | Ermengarde retrouve la Couronne, fonde Hautecouronne et écrit le premier volume. Pour reconstruire, elle emprunte à **Barnabé Liard**, prêteur légendaire. | — |
| Les Élus | Sept Élus se succèdent. Il y a 40 ans, Aubéric, simple aventurier, remporte le septième Concours avec son compagnon Rowan et épouse l'héritière Aliénor. Mélisende naît. | Sir Rowan, la reine |
| Il y a quelques années | Le dernier Liard (même nom, même métier, de père en fils) disparaît. Son Grand Livre se perd. | — |
| **Le présent** | Le tableau de la section 2. Il n'avance pas. | Tout le jeu |

---

## 4. Le merveilleux sans dieux : la Résonance

- **Elle s'appuie sur la matière.** Cristaux, métaux et pierre célestrine vibrent et stockent de l'énergie. Les matériaux du jeu sont plus ou moins résonants.
- **Elle s'apprend.** Enchanteurs (Mernil), alchimistes (Gruffo, Margot), mages, forgerons : ce sont des artisans, pas des prêtres.
- **Elle laisse des Échos.** Une émotion très forte, dans un lieu très résonant, s'imprime et **se rejoue en boucle**. C'est l'explication des fantômes, et de la boucle elle-même : Capitaine Crow, Yuki-Onna, la Maison hantée et le Sentier brumeux. Le peuple parle d'« âmes damnées » ; c'est la référence religieuse légère.
- **Elle est collective.** Les **Pierres-Échos** amplifient ce qu'on y dépose. Quand assez de voyageurs y fondent leur or, la pierre libère une onde qui profite à tous. Le peuple appelle cela une « bénédiction » et la gardienne « l'Oracle ».
- **Elle écrit.** Les registres célestrins sont liés par résonance aux engagements qu'ils consignent. Une promesse de payer, prononcée devant témoins, peut s'inscrire seule sur leurs pages. Le Grand Livre en est le dernier exemplaire connu.
- **Le folklore reste léger.** Les « esprits anciens » ou « esprits de la nature » qu'on remercie après une bonne expédition, la pièce posée au pied d'une pierre levée : on ne tranche jamais.

---

## 5. Géographie

> **Le canon passe d'abord.** L'annexe A liste, pour chaque lieu, ce que le jeu en dit déjà : description, voisins et temps de trajet, auberge, boutiques, zones d'expédition, big events qui s'y déclenchent. Elle est générée depuis `develop`. La proposition **ajoute** des détails, elle ne **contredit** jamais l'annexe ; la colonne « Ajouts » ci-dessous dit exactement ce qui est nouveau.
>
> Le jeu ne donne que quelques directions : le Berceau est à l'ouest, la Forêt du Vieillard au sud du Berceau, le Chemin du Dédale au sud de la forêt, le Croisement des Destins à l'ouest du Mont Célestrum, le Grand Axe contourne le mont par le nord et l'Étendue est « nordique ». Les régions ci-dessous suivent donc les voisinages, pas une boussole.

### Le continent

| Région | Lieux | Ce que dit le jeu (canon) | Ajouts de la proposition | Habitants récurrents |
|---|---|---|---|---|
| L'Ouest | Le Berceau, Voie champêtre, Forêt du Vieillard, Chemin du Dédale, Grande Rue | Plaine de l'ouest, champs et fermes (events 9, 22, 33). Une forêt où l'on se perd. Un ancien labyrinthe oublié sous la végétation. L'ancienne route commerciale vers Ville Forte, réduite à des pavés ébréchés. | Le pays d'où partent les aventuriers. | Le paysan à la fourche, Mylène, Donia (Forêt du Vieillard), Théobald |
| Mergagnan et la côte | Mergagnan, Plage Sentinelle | Une paisible ville au bord de la plage, avec un port et des jardins. Tanneur, Vétérinaire et forgeron ; auberge Au Coin du Feu. Un bateau aux voiles noires est parfois amarré à la plage (event 75). | Les traversées vers les îles partent d'ici. Le chantier abandonné du baron Almerac (event 18 réécrit). | Le capitaine Morgat, le pirate au tricorne, Gruffo |
| Le domaine royal | Boug-Coton, Cour du Château, Route vers le château, Portes du château, Salle de réception | Boug-Coton est un village paisible réputé pour son auberge. L'Auberge du Seigneur est luxueuse, fréquentée par des nobles, et le roi y aurait séjourné ; sous elle s'étendent des caves secrètes. La Cour du Château est une esplanade qui relie Boug-Coton aux portes, parcourue de passages secrets. La Salle de réception mène à chaque ville en une heure. Une cité royale entoure le château, avec sa muraille et ses rues animées (events 82 et 89) ; dans l'aile ouest, le bailli rend la justice (event 83). On parle de silhouettes encapuchonnées dans le sous-sol d'une grange de Boug-Coton (event 63). | **Hautecouronne** est le nom de cette cité royale. La grange de l'event 63 est le repaire de la Main Grise, et son sous-sol rejoint les caves de l'auberge. | La cour, la Garde, la Main Grise, les seigneurs de Boug-Coton, Lucya |
| Ville Forte et le Croisement | Ville Forte, Croisement des Destins | Une ancienne grande ville fortifiée, ravagée par l'ancienne guerre : il reste une dizaine de maisons, des remparts en ruines et des galeries dessous. Gorim le ferrailleur, le Marchand de matériaux, la Chope Sanglante. Le Croisement des Destins est le grand carrefour à l'ouest du mont. | C'était la capitale avant la Guerre des Héritiers. | Gorim, le Marchand de matériaux |
| Le Massif du Célestrum | Mont Célestrum, Forêt Célestrum, Chemin aux Loups, Grand Axe, L'Étendue | La montagne dominante, visible de tous. On raconte qu'elle porte le nom d'une ancienne déesse, et seule M-B en a atteint le sommet ; ses grottes n'ont pas de fond. La forêt grimpe sur ses pentes. Le Grand Axe la contourne par le nord et appartient aux brigands. L'Étendue est une plaine vide où l'on trouve une ferme (event 62). | Les ruines de Célestrum, la cité célestrine, sont au sommet : la « déesse » n'est que le nom déformé de la cité. | Talvar, Moltiar et les nains, Parziter et Xetrix (Forêt Célestrum), les brigands du Grand Axe |
| Le désert et la Vacarme | Vallée des Rois, La Dune, Village Coco, Rivière Vacarme | Un désert nommé d'après les anciens rois, semé de leurs tombeaux. La Dune est une plage créée par les vents de la Vallée. Village Coco est l'oasis des nobles de la Vallée, réputée pour ses noix de coco et ses terrains convoités ; on y trouve l'Herboriste, le Bûcheron et la Gorgée Brûlante. La Vacarme a un courant meurtrier et se jette dans le Lac Mirage. | Les anciens rois sont les Rois-Guerriers de la chronologie. | Xirtex, les nobles de la Vallée, l'Herboriste, le Bûcheron |
| Claire de Ville et ses abords | Claire de Ville, Route Grimpante, Bois Hurlant, Route des Merveilles, Rivière aux Crabes, Lac Mirage, Route Marécageuse | Une grande ville marchande, autrefois pauvre, **réputée pour son calme et son respect de l'ordre**. Des souterrains datent de sa misère ; elle a de nombreux commerces et hôtels, la Bourse, un vétérinaire et la Halte des Braves. Un tournoi se tient devant ses murailles (event 72). Le Bois Hurlant la borde : des brigands se terrent dans les grottes de ses collines. La Route des Merveilles devient un marché de vendeurs ambulants, au milieu d'échoppes en ruines. La Rivière aux Crabes a des quais et ravitaille ses poissonniers. Le Lac Mirage réunit les familles. | La bibliothèque de dame Ermesinde. La Foire des Roues sur la Route des Merveilles. | Gauvain et Yseldia, Yvain, dame Ermesinde, les courtiers, Aldéric (Route des Merveilles), Maurice (quais de la Rivière aux Crabes), Gruffo (Route Marécageuse) |

**Sans attache :** Gaspard-Jo, Hilda, Price, le Chevalier sans Blason et les marchands itinérants apparaissent partout. Lucya et Gruffo, eux, ont des lieux de prédilection mais voyagent.

### Les villes : ce qu'un event peut en dire

Les six villes (Boug-Coton, Ville Forte, Village Coco, Claire de Ville, Mergagnan et la Cour du Château) ont un **menu** qui s'ouvre juste après l'event d'arrivée. L'annexe A.1 donne, ville par ville, l'auberge, les services, les boutiques et les textes du jeu. Un event de ville respecte ces règles :

1. **Ne pas nier ce que le menu propose.** Pas de forge fermée ou abandonnée là où il y a un forgeron, pas d'auberge introuvable, pas de village « qui ne compte que deux commerces ». Un refus ou une auberge complète restent possibles, mais ce sont des contretemps du moment, que l'écran suivant ne dément pas.
2. **Ne pas déplacer un service du jeu.** Il n'y a pas de forgeron à Village Coco, pas de vétérinaire à Boug-Coton, pas de Bourse hors de Claire de Ville, et Gorim n'est qu'à Ville Forte. Le décor peut ajouter des commerces sans fonction en jeu (un bijoutier, une bibliothèque, une cuisine de rue, un étal de marché), sans prétendre qu'ils sont les seuls.
3. **Une auberge par ville, celle du jeu.** L'auberge d'un event porte le nom de celle de la ville. Une « taverne » ou un « bar » est soit cette auberge, soit un comptoir sans chambres.
4. **Ce qui varie n'est jamais fixé.** L'enchanteur Mernil change de ville chaque jour, et le domaine de guilde dépend de la guilde du joueur. Un event ne les place pas dans une ville et ne les en exclut pas. Le notaire, lui, est partout.
5. **Le ton suit la ville.** Claire de Ville est calme et respectueuse de l'ordre. Mergagnan est paisible. Ville Forte est une ruine d'une dizaine de maisons. Boug-Coton est un village paisible avec une auberge de luxe. Village Coco est l'oasis convoitée des nobles, la ville où un logis coûte le plus cher.
6. **Garder le joueur en ville seulement si c'est cohérent.** Une issue garde le joueur en ville (`forceStayInCity`) s'il y reste naturellement. S'il fuit les gardes ou se fait chasser, il reçoit le choix normal entre rester et repartir.

### Les Îles Errantes

| Île | Nom proposé | Ce qu'elle était | Colosse (rendormi chaque semaine) | Échos et gardiens |
|---|---|---|---|---|
| Volcanique (1000-1005) | **Braise** | Les forges célestrines, le Canal Lavique | Titan de magma | Mutant Vaseux (raté de laboratoire), Golem de pierre |
| Glacée (1100-1107) | **Givre** | La cité-jardin gelée en une nuit | Seigneur et Reine des glaces (et leur œuf) | Yuki-Onna (Écho de dame Neigeline), Gardien des Portes |
| Maritime (1200-1206) | **Île des Marées** | Port et observatoires | Léviathan (dont le sommeil tient l'île à flot), Kraken | Capitaine Crow (Écho), Esprit des mers, Sirène |

---

## 6. Factions et tensions permanentes

| Faction | Ce qu'elle veut | Pourquoi elle n'y arrive jamais | Ce que ça produit en jeu, à l'infini |
|---|---|---|---|
| **La Couronne** (Aubéric, Aliénor, Mélisende, la cour) | Un successeur digne | Mélisende refuse chaque champion | Le Concours perpétuel, les missives royales, les traversées financées |
| **La Chancellerie** (Bureau du Concours, AGC, SAFAC, SPAC, Banque) | Tout enregistrer | Tout change trop vite | Paperasse comique, licences, jetons de route, recouvrement officiel |
| **La Main Grise** | Une couronne héréditaire et un roi fantoche (le Chevalier sans Blason) | Trop de gens la gênent, à commencer par les aventuriers | Embuscades, rumeurs, tunnels, faux témoins ; elle veut **le Grand Livre** (section 8.1) |
| **Le Parti des Lignées** (Duc Benatis, seigneur voisin de Boug-Coton, nobles de la Vallée) | Abolir la Charte | Divisé, endetté | Querelles de seigneurs, duels, dettes nobles |
| **Les Nains du Célestrum** | Protéger les bêtes (Talvar), ou s'en protéger (Moltiar) | Ils sont frères | Petits events avec Talvar et Moltiar |
| **Le Clan des Liants** (Velanna) | Que le lien maître-bête ne serve jamais à enchaîner | Le Talisman de Clonage existe | Expéditions, conseils |
| **Les Gardiens des Pierres** (« l'Oracle ») | Comprendre les Pierres-Échos | Elles restent un mystère | Bénédictions collectives |
| **La Foire des Roues** (marchands ambulants) | Vendre | Les escrocs ternissent la profession | Boutiques ambulantes, arnaques, recettes |
| **La Compagnie du Fer-Rouge** (mercenaires) | Des contrats | Elle sert le plus offrant | Recrutement pour les îles, champions loués, gros bras de débiteurs |
| **Les Annonciateurs** | Prouver que les îles vont s'écraser | Les îles repartent chaque semaine | Prédictions, amulettes anti-îles ; ils remplacent les prêcheurs |
| **Brigands et pirates** | Dépouiller | Il y a toujours plus fort | Embuscades et fêtes douteuses |

La **Main Grise** remplace la secte démoniaque. Ses membres se réunissent en robes noires dans le sous-sol d'une grange de Boug-Coton (event 63), qui rejoint les caves secrètes creusées sous l'Auberge du Seigneur. Ils entretiennent eux-mêmes la **rumeur de sacrifices à un démon** pour éloigner les curieux. Elle est financée par le Parti des Lignées et dirigée, selon la révélation (section 9), par le **Trésorier royal**. Price en est l'homme de main.

---

## 7. Personnages

Chaque fiche suit le même format :
- **Situation permanente** : ce qui est vrai à chaque rencontre.
- **Variations** : ce que les tirages aléatoires expriment (R3).
- **Immuable** : ce qu'aucune quête ne change.
- **Révélation** : ce que le joueur peut apprendre, côté joueur uniquement (R2).
- **Au Grand Livre** : ce qu'il doit typiquement (section 8.1).

### 7.1 La couronne

**Le roi *Aubéric*, septième Élu**
- **Situation :** il vieillit et la Couronne lui pèse. Il organise le Concours, défile, envoie ses missives.
- **Variations :** bienveillant, épuisé ou impatient selon le moment.
- **Immuable :** il règne et ne meurt pas.
- **Révélation :** il était un simple aventurier, comme vous ; ses mains tremblent quand les îles affleurent.
- **Au Grand Livre :** la Couronne doit encore à la maison Liard une partie de l'emprunt d'Ermengarde. Le royaume est techniquement endetté, et c'est un secret d'État.

**La princesse *Mélisende***
- **Situation :** héritière de la lignée de la Charte. Personne ne connaît son visage. Elle refuse chaque champion.
- **Variations :** les rumeurs sur elle se contredisent, et c'est voulu.
- **Immuable :** elle n'est jamais conquise.
- **Révélation :** **c'est la jeune femme guide** qui accueille les nouveaux aventuriers. Elle observe tout le monde, et donc vous.

**La reine *Aliénor***
- **Situation :** elle s'ennuie à la cour, comme le montre l'hallucination de Pérotin.
- **Révélation :** elle se méfie du Trésorier.

**Sir Rowan**
- **Situation :** ancien capitaine de la Garde, devenu maître d'armes errant. Bavard et paternel.
- **Variations :** les leçons portent sur des techniques différentes.
- **Révélation :** il a gagné le septième Concours aux côtés d'Aubéric, mais seul Aubéric est entré dans la Chronique. Il est aussi le maître d'armes secret de Mélisende.

**Ancelin Vautre, Trésorier royal**
- **Situation :** affable, il fixe le cours de l'argent du roi.
- **Immuable :** il n'est jamais démasqué publiquement.
- **Révélation :** il dirige la Main Grise. Il cherche le Grand Livre, qui contient les dettes des nobles et donc de quoi les faire chanter. Une fois que vous le savez, chacune de ses salutations courtoises devient glaçante.

**Les officiers de la cour**
- **Maître Hardouin, Forgeron royal :** seul forgeron du niveau 5, maître de tous les forgerons de ville, qui exige d'être « digne de sa forge ».
- **Clotaire, l'Archiviste :** il compte les victoires sur les Colosses et ne parle jamais de « morts ».
- **Anselme, le Maître des quêtes :** il troque les contrats et délivre les **lettres de recouvrement** (section 8.1).

### 7.2 Les nains et les dresseurs

**Talvar l'Ami-des-Créatures**
- **Situation :** il s'extasie devant les familiers épanouis et sermonne les négligents.
- **Variations :** selon le familier présenté.
- **Révélation :** il a pardonné à la bête qui a défiguré son frère, et Moltiar ne le lui pardonne pas.
- **Au Grand Livre :** il ne doit jamais rien. En revanche, il prête sans compter et refuse d'être remboursé.

**Moltiar**
- **Situation :** il surgit des rochers pour menacer les familiers.
- **Variations :** on peut l'amadouer avec de la nourriture, le distraire ou l'intimider.
- **Révélation :** c'est lui, « l'ancien du clan » qui a brisé le lien avec sa bête à force de la rappeler.
- **Au Grand Livre :** il doit souvent des sommes pour du matériel cassé, et paie de mauvaise grâce, en nature (racines, bière).

**Velanna**
- **Situation :** guerrière des Liants, gardienne du Talisman d'Ancrage, avare de mots.
- **Révélation :** son pacte avec Talvar est né du drame de Moltiar.

**Les autres**
- **Ysgerd**, l'épouse de Talvar, est excédée par les portraits d'animaux.
- **Lucien Amblard**, le vétérinaire de la cour, correspond avec Talvar.

### 7.3 Les savants, les artistes et les soigneurs

- **Périssien.** C'est le maître de Pérotin (la musique) et de Gruffo (l'alchimie). Il a légué à Pérotin une mandoline célestrine qui fait vivre les chansons. **Situation :** il est caché sous le capuchon du conteur de la cité de porcelaine.
- **Pérotin.** Ménestrel génial, fantasque et séditieux. Ses drogues sont une béquille, parce qu'il ne maîtrise pas la mandoline. **Au Grand Livre :** il doit de l'argent dans chaque auberge et paie en chansons, parfois en hallucinations.
- **Gruffo.** Alchimiste des marais, au grand cœur, jaloux de Pérotin. **Au Grand Livre :** il doit ses ingrédients, et paie en potions expérimentales.
- **La Vieille Margot.** La sorcière muette, une ancienne alchimiste du royaume, chassée après la mort d'un enfant qu'elle tentait de soigner. **Variations :** ses potions réussissent ou ratent (R3). **Révélation :** des faux témoins de la Main Grise l'ont accusée.
- **Hilda.** Guérisseuse des routes et ancienne apprentie de Margot.
- **Parziter.** Érudit terrorisé. Ses visions sont des souvenirs de la Brisure, captés par un fragment de Pierre-Écho. Il vit avec son chat Minou.
- **Mernil.** Enchanteur vaniteux, qui tire ses enchantements d'éclats célestrins achetés à Gorim, à crédit. **Au Grand Livre :** c'est un débiteur chronique, qui paie toujours avec retard et toujours avec arrogance.
- **Dame Ermesinde.** La bibliothécaire de Claire de Ville, qui garde le premier volume de la Chronique.

### 7.4 Les gens des routes

- **Gorim le Brise-Fer.** Ferrailleur de Ville Forte. **Révélation :** il est l'arrière-petit-fils de Mathilde Brise-Fer, « M-B », la seule alpiniste à avoir atteint le sommet du Célestrum ; il possède son carnet sans le savoir. **Au Grand Livre :** il ne doit jamais rien, mais on lui doit beaucoup, à commencer par Mernil.
- **Xetrix et Xirtex.** Des frères ermites, seuls survivants de l'expédition familiale vers le sommet, chacun accusant l'autre. **Variations :** ils accueillent ou égarent les voyageurs. **Au Grand Livre :** ils se doivent mutuellement une somme absurde que ni l'un ni l'autre ne paiera.
- **Price.** Mercenaire charmeur, agent double de la Main Grise. **Variations :** il vous escorte ou il vous vole (R3). **Au Grand Livre :** ses dettes disparaissent mystérieusement quand on s'en approche.
- **Le Chevalier sans Blason.** Le chevalier noir des routes. **Variations :** aimable ou brutal. **Révélation :** il est le dernier héritier de l'ancienne dynastie, celui que la Main Grise veut couronner.
- **Aldéric l'antiquaire.** Il connaît l'histoire de chaque relique. **Au Grand Livre :** il est créancier plus que débiteur ; il rachète parfois des dettes.
- **Gaspard-Jo.** Marchand de soupe généreux. Son grimoire de cuisine appartenait à la famille de Lucya.
- **Lucya.** Cuisinière voyageuse qui rêve d'ouvrir son auberge. **Au Grand Livre :** elle a emprunté pour ses fourneaux, et paie toujours, mais en plats.
- **Le Duc Benatis.** 21 ans, des bananes, des esclaves et des dettes. **Au Grand Livre :** c'est **le débiteur infini** ; il a la page la plus longue du Livre.
- **Le baron Almerac** (mort). Il faisait bâtir une halle de pierre à Mergagnan ; à sa mort, l'argent s'est tari et le chantier est resté en plan, registres compris (event 18). **Immuable :** le chantier ne sera jamais terminé. **Au Grand Livre :** sa page porte des intérêts impayés à la maison Liard. La dette a survécu au baron : on la réclame à ses héritiers, à ses compagnons ou à celui qui a racheté ses registres, et chacun renvoie à un autre.
- **Les seigneurs de Boug-Coton** se disputent l'Auberge du Seigneur et empruntent pour payer des champions.
- **Théobald et Mylène,** l'oncle et la nièce. Théobald garde une graine célestrine ; Mylène, une recette de famille.
- **Donia,** une Fae, ou peut-être pas. Elle paie ses dettes en visions.
- **Le capitaine Morgat,** passeur hebdomadaire vers les îles. **Au Grand Livre :** il est le transporteur de toutes les cargaisons à escorter.
- **Le pirate au tricorne,** petit-fils de Capitaine Crow, qui cherche son trésor.
- **Maurice,** le crabe noir géant. Il ne doit rien, c'est un crabe.

### 7.5 Les Colosses et les Échos

On ne les tue jamais : on les repousse ou on les rendort (R7).

| Créature | Situation permanente |
|---|---|
| Léviathan | Son sommeil tient l'Île des Marées à flot ; chaque semaine, il se réveille à moitié. |
| Titan de magma | Le reste de la tentative célestrine d'enchaîner le volcan ; il se reforme dans le Canal Lavique. |
| Seigneur et Reine des glaces | Un couple de dragons qui couve un œuf qui n'éclot jamais. |
| Yuki-Onna | L'Écho de dame Neigeline, qui rejoue sa dernière nuit. |
| Capitaine Crow | L'Écho du pirate, qui rejoue son naufrage. |
| Le Gardien des Portes | Automate célestrin, qui se réactive chaque semaine. |

### 7.6 Le Tableau d'Honneur (le staff)

Les membres du staff deviennent d'**anciens champions de Concours passés**, inscrits au Tableau d'Honneur :
- **Draft :** « l'Architecte, cartographe légendaire qui traça la première carte de la Contrée » ;
- **Kyusaki :** « fondateur de la Voie du Souffle, une école de méditation martiale » ;
- **Ines :** « compagne d'armes de Kyusaki » ;
- **Hitori :** il cherche « les trésors des Célestrins » plutôt que « les Dieux ».

---

## 8. Les lignes de quêtes infinies

### 8.1 Ligne phare : le Grand Livre de Liard (les créances)

#### Le principe
Au détour d'un chemin, le joueur trouve un gros registre relié de cuir sombre, aux coins ferrés : **le Grand Livre de la maison Liard**. Pendant trois siècles, la maison Liard a prêté à toute la Contrée : paysans, aubergistes, seigneurs, et même la Couronne. Le dernier Liard a disparu il y a quelques années.

Le Livre est un **registre célestrin résonant** :
- il contient des milliers de créances, dont la plupart sont encore dues ;
- **il se remplit tout seul.** Chaque dette contractée dans la Contrée devant témoin finit par y apparaître, ce qui rend la ligne infinie dans le lore lui-même ;
- on y retrouve souvent les mêmes noms, parce que les gens réempruntent, ce qui rend les débiteurs réutilisables.

Le Maître des quêtes (Anselme) délivre au joueur une **lettre de recouvrement** de la Chancellerie. Le joueur devient **Recouvreur assermenté** et touche une **commission** sur chaque somme rapportée. Le reste revient « à la succession Liard », qui ne réclame jamais rien ; c'est un mystère de la ligne.

> Pistes de nom pour la mécanique : *Le Grand Livre*, *Les Créances*, *Recouvrements*. Le titre du joueur pourrait être Recouvreur, Huissier des routes ou Porteur du Livre.

#### Anatomie d'une créance (générée)
Une créance combine plusieurs éléments tirés de pools :

| Élément | Pool | Exemples |
|---|---|---|
| **Débiteur** | Personnages récurrents (section 7) et archétypes anonymes (« un meunier de l'Étendue ») | Duc Benatis, Mernil, Pérotin, un pêcheur de Mergagnan |
| **Motif** | Une ligne de texte par motif | « trois tonneaux d'hydromel », « une mandoline réparée », « la dot de sa sœur » |
| **Montant** | Échelonné selon le rang du joueur et le débiteur | 50 à 50 000 |
| **Lieu** | Ville ou lieu du débiteur | Mergagnan, Village Coco… |
| **Situation** | Le modèle de résolution (ci-dessous) | « attend sa cargaison » |

#### Les modèles de résolution (écrits une fois, rejoués à l'infini)

| Modèle | Ce qui se passe | Mécanique réutilisée | Récompense |
|---|---|---|---|
| **Comptant** | Le débiteur paie, en râlant, soulagé ou en marchandant | Aucune | Commission |
| **Cargaison** | « Ma cargaison arrive au port ; escortez-la jusqu'à chez moi et je vous paie le double » | Déplacement entre deux lieux, combat d'embuscade possible | Commission majorée |
| **Service** | Il paiera si on l'aide : chasser une bête, récolter, livrer | Combat de monstre, matériaux, plantes, cuisine | Commission et objet |
| **En nature** | Il n'a pas d'or : il propose un objet, une potion, un matériau, une recette | Inventaire | L'objet, parfois meilleur que l'argent |
| **Refus** | Il refuse ou envoie ses gros bras, souvent loués au Fer-Rouge | Combat | Commission et pénalité au débiteur |
| **Renvoi** | « Je ne peux pas payer, mais *untel* me doit le double ! Allez le voir. » | Une nouvelle créance générée | **Chaîne de dettes** potentiellement infinie |
| **Rachat** | Un tiers (Aldéric, un usurier, la Main Grise) propose de racheter la créance tout de suite, à moindre prix | Choix | Moins d'argent, mais immédiat |
| **Délai** | « Revenez dans trois jours, avec les intérêts » | Minuterie | Commission majorée |
| **Disparu** | Le débiteur a fui ; une rumeur indique où il est | Déplacement vers un lieu | Commission |
| **Clémence** | Le joueur efface la dette | Réputation | Une faveur du débiteur, plus tard |
| **Absurde** | Maurice le crabe, les frères ermites, Donia… | Aucune | Humour, petite récompense |

Chaque modèle demande peu d'écriture : une introduction, deux ou trois variantes par issue, et des répliques adaptées au tempérament du débiteur (fier, piteux, roublard, généreux), qui peuvent être partagées par plusieurs débiteurs.

#### Les rangs de Recouvreur (progression du joueur)

| Rang | Créances accessibles |
|---|---|
| Commis | Paysans, artisans, petites sommes |
| Recouvreur | Marchands, aubergistes, Mernil, Pérotin |
| Huissier des routes | Seigneurs, guildes, Compagnie du Fer-Rouge |
| Maître du Livre | Nobles (Duc Benatis), dettes d'îles (cargaisons perdues sur Braise, Givre, les Marées) |
| ??? | La page de la Couronne : on la lit, on ne la recouvre jamais (R2) |

#### Une quête qui ne finit jamais : l'horizon fuyant
Dans le journal de quêtes, le Grand Livre s'affiche comme une quête normale. **Une étape correspond à une page, et une page correspond à une créance.** Cette créance se résout avec l'un des **modèles répétables** (Cargaison, Service, Refus, Renvoi…). Le compteur de pages donne l'horizon infini ; les modèles donnent le gameplay, écrit une fois et rejoué à l'infini.

Dans le journal, l'étape en cours est générée à partir de la créance :

> **Étape 13 : Recouvrer la dette de Mernil**
> *Il attend une cargaison de cristaux au port de Mergagnan. Escortez-la jusqu'à son atelier et il paiera le double.*

Un **Renvoi** (« untel me doit le double ») ouvre une sous-chaîne **dans la même page** : la page n'est tournée qu'une fois la chaîne soldée.

#### Plusieurs pages ouvertes en même temps (occasionnellement)
En temps normal, **une seule page est ouverte**. De temps en temps, une ou deux pages supplémentaires s'ouvrent en parallèle, **jusqu'à 3 pages ouvertes au maximum**. Le compteur reste le nombre de pages soldées, quel que soit l'ordre dans lequel elles sont soldées.

Ce qui ouvre une page en plus :

| Déclencheur | Ce qui se passe | Pourquoi c'est bien |
|---|---|---|
| **Délai** | Le débiteur demande trois jours. Pour ne pas bloquer le joueur, le Livre ouvre la page suivante pendant l'attente. | Le joueur n'est jamais coincé à attendre. |
| **Page volante** | Un petit event ou un big event fait tomber une feuille volante du Livre (« une créance oubliée glissée entre deux pages »). | Une surprise ponctuelle, peu fréquente. |
| **Créance locale** | En arrivant dans une ville, un débiteur du coin se signale de lui-même (« vous êtes le Recouvreur ? J'aimerais solder ma dette avant qu'on vienne me la réclamer »). | Récompense l'exploration. |
| **Cargaison groupée** | Deux débiteurs attendent leur marchandise sur le même bateau, au même port. | Une escorte, deux pages : un moment fort. |

Règles :
- **Plafond de 3 pages ouvertes.** Au-delà, les déclencheurs ne font rien, ou la page volante attend dans le Livre.
- **Pas d'échec par abandon.** Une page ouverte n'expire pas ; seul le modèle Délai a une minuterie, et elle ne fait que majorer la commission.
- **Le journal liste les pages ouvertes** sous la barre de progression :

> 📖 **Le Grand Livre de Liard** — 13/16 pages
> • **Page 14 :** Mernil attend sa cargaison de cristaux au port de Mergagnan.
> • **Page 15** *(feuille volante)* : un meunier de l'Étendue doit trois sacs de grain.

- **L'horizon reste fuyant.** Comme le total vaut au moins pages soldées + 5, il y a toujours de la place pour 3 pages ouvertes en plus de la progression.

- **Au départ, le joueur voit `1/8`.** La première étape est « Trouver le Livre ».
- **Le Livre s'épaissit par cahiers.** Les pages arrivent par **cahiers de 4**, et le Livre montre toujours **deux cahiers d'avance**. Quand le joueur entame un nouveau cahier, un cahier s'ajoute au bout et le total grandit : `3/8 → 4/12 → 8/16 → 12/20…`
- **Le message est diégétique :** « Le Grand Livre s'est épaissi : de nouvelles pages ont paru à l'encre fraîche. »
- **Le total reste toujours au-dessus de la progression.** Il y a au moins 5 pages d'avance, donc la quête **ne peut jamais être terminée** et n'apparaît jamais dans « Quêtes terminées ».
- **Formule :** `total = (⌊pages terminées / 4⌋ + 2) × 4`.

| Pages terminées | Affichage |
|---|---|
| 1 (le Livre est trouvé) | 1/8 |
| 3 | 3/8 |
| 4 | 4/12, un cahier s'ajoute |
| 7 | 7/12 |
| 8 | 8/16 |
| 100 | 100/108 |

**Ce que contiennent les pages.**
- **Les 40 premières pages sont écrites à la main.** Chacune a un débiteur, un motif et un modèle choisis, ainsi qu'une « vieille page » d'une ligne qui livre un fragment de lore.
- **Au-delà, les pages sont procédurales.** Le débiteur, le motif, le montant et le modèle sont tirés au sort. Le tirage pondère les modèles pour éviter deux fois de suite le même, et les débiteurs récurrents reviennent.
- **On peut ajouter des pages écrites à tout moment** sans casser la progression. C'est du contenu qui se rajoute à l'infini.

#### Des big events débloqués par le Livre
Certains big events n'entrent dans le pool qu'à partir d'une page du Livre. Pour respecter R2 et R8, il y a deux sortes de déblocages :

| Type | Condition | Usage | Effort |
|---|---|---|---|
| **Débloquer** (le cas par défaut) | Page ≥ N, sans limite haute | L'event rejoint **définitivement** le pool répétable du joueur. C'est du contenu stable, vu des dizaines de fois. | Rentable |
| **Fenêtre** (rare) | N ≤ page ≤ M | L'event n'existe que pendant une étape, par exemple une scène de révélation. C'est du contenu presque jetable. | Cher, à réserver aux révélations |
| **Modèle actif** | La créance en cours utilise le modèle X | L'event n'apparaît que si **au moins une page ouverte** utilise ce modèle. Exemple : le big event « La cargaison du port » ne sort que lorsqu'une page ouverte est une Cargaison. Comme les modèles reviennent sans cesse, ce n'est **pas** du jetable. | Rentable |

Exemples de big events débloqués :

| À partir de la page | Big event (répétable) | Ce qu'il apporte |
|---|---|---|
| 2 | **Le débiteur qui vous reconnaît** : un passant pâlit en voyant le Livre et propose de payer « avant que ça n'y figure » | Une variante d'humour, de l'argent |
| 5 | **L'embuscade de la Main Grise** : des encapuchonnés veulent le Livre | Un combat récurrent, le fil de la Main Grise |
| 8 | **Le recouvreur rival**, porteur d'une fausse lettre | Une rivalité récurrente |
| 12 | **La cargaison du port**, déclinée en tous les modèles « Cargaison » sous forme de big event | Escorte et combat |
| 16 | **L'offre du Trésorier** : il propose de « garder le Livre en lieu sûr » | Une tension récurrente, ironie dramatique après la révélation |
| 20 (fenêtre 20-21) | **La page de la Couronne** se révèle | Une révélation, vue une fois |

#### Les vieilles pages : un vecteur de lore très bon marché
À chaque rang, de **vieilles pages** deviennent lisibles (l'encre célestrine réapparaît). Ce sont des **entrées d'une seule ligne**, et c'est la manière la plus économique de distiller les révélations :

> *« Ermengarde, reine. Reconstruction de la Cité. 40 000 couronnes. Remboursé : 31 000. Solde transmis à ses successeurs. »*
>
> *« Mathilde Brise-Fer. Cordes, piolets, vivres pour l'ascension. Remboursé en totalité, avec un croquis du sommet (voir annexe). »*
>
> *« Talvar. Un bœuf malade racheté pour lui éviter l'abattoir. Prêt refusé par l'emprunteur lui-même, qui a insisté pour l'offrir. »*
>
> *« A. Vautre. 12 000. Garant : Duc Benatis (père). »*
>
> *« Moltiar. Une bête, rachetée au clan des Liants. Non remboursé : la bête n'est jamais revenue. »*

Chaque page coûte une ligne d'écriture et apporte un fragment de révélation, à rapprocher de tout le reste.

#### Les menaces récurrentes
- **La Main Grise** veut le Livre, parce qu'il contient les dettes des nobles et donc de quoi les faire chanter. Elle tend des embuscades récurrentes : c'est un combat réutilisable. Le Trésorier propose de « garder le Livre en lieu sûr » ; c'est un piège.
- **Des recouvreurs rivaux,** porteurs de fausses lettres, réclament les mêmes dettes. Ils peuvent être des joueurs ou des PNJ.
- **La question permanente :** où est le dernier Liard ? Le Livre ne le dit jamais. C'est un mystère volontairement non résolu.

#### Pourquoi la ligne marche
Elle est infinie dans le lore (le Livre se remplit seul), elle réutilise les personnages récurrents (ils réempruntent), elle exploite les mécaniques existantes (déplacement, combat, matériaux, cuisine, objets), elle sert de vecteur de révélations à une ligne et elle n'altère jamais l'état du monde.

### 8.2 Le Courrier des routes
Les personnages récurrents s'écrivent beaucoup : Talvar et le vétérinaire Amblard, Lucya et Gaspard-Jo, Rowan et Mélisende (en secret), Gorim et Mernil (des factures), Xetrix et Xirtex (qui ne s'écrivent pas, mais on peut essayer). Le joueur porte les lettres.
- **Modèle :** un expéditeur, un destinataire et un contenu, tirés de pools. La réponse peut repartir dans l'autre sens.
- **Révélation :** certaines lettres scellées peuvent être ouvertes, au prix de la réputation.

### 8.3 Les Échos à apaiser
Chaque Écho (Crow, Yuki-Onna, la Maison hantée, le Sentier brumeux, de petits Échos anonymes) peut être **apaisé pour un temps** en rejouant correctement sa scène : choix de dialogue, objet, combat. Le lendemain, il recommence ; c'est sa nature (R7).
- **Révélation :** des fragments de la nuit de la Brisure.

### 8.4 Les Fragments célestrins
Le joueur ramasse des fragments sur les îles et dans les ruines. Gorim les rachète, Mernil les convoite, Parziter les déchiffre, Aldéric les authentifie. C'est une collection sans fin (fragments communs, rares, uniques), et chaque fragment unique vient avec une ligne de lore.

### 8.5 Les contrats de la Chronique
Ce sont les missions existantes, recadrées en **contrats** délivrés par Anselme au nom du Bureau du Concours. Elles servent de liant entre toutes les autres lignes.

---

## 9. Les révélations (finies, vues une fois, bon marché)

Les révélations sont la seule partie « jetable », donc on les garde courtes. Chacune est faite de **2 à 4 étapes qui réutilisent des events existants** (« rencontrer Talvar », « vaincre le Titan », « lire une vieille page »), d'**une scène finale courte** et d'**une entrée dans le carnet du joueur**. La campagne de missions existante peut les porter.

| Révélation | Ce que le joueur apprend | Ce qui ne change pas |
|---|---|---|
| La guide | La guide du château est Mélisende | La guide continue d'accueillir |
| Les deux frères nains | Moltiar et la bête, Talvar et le pardon | Moltiar grogne toujours |
| Le maître et ses deux élèves | Périssien, la mandoline célestrine | Pérotin drogue toujours ses auditeurs |
| Le procès de Margot | Les faux témoins de la Main Grise | Margot rate toujours ses potions |
| La grange de Boug-Coton | Pas de démon, juste la Main Grise | Les villageois y croient toujours |
| L'homme de main | Price est un agent double | Price vous escorte, ou vous vole |
| Le Chevalier sans Blason | Il est l'héritier de l'ancienne dynastie | Il galope toujours sur les routes |
| Le Trésorier | Il dirige la Main Grise (preuves dans le Livre) | Personne ne vous croit ; il vous sourit |
| M-B | Mathilde Brise-Fer, son carnet chez Gorim | Le sommet reste inaccessible |
| Les îles | Ce sont des fragments célestrins | Elles reviennent chaque semaine |
| La Couronne | Elle tient les îles à distance | Le roi vieillit, les îles reviennent |
| La page de la Couronne | La Couronne doit encore de l'argent à la maison Liard | On ne la recouvre jamais |

> Le joueur qui a tout vu ne joue pas dans un autre monde : il joue dans **le même monde, mais en voyant la trame**.

---

## 10. Le monde bouge par les données

Ces variables systémiques peuvent être injectées dans des textes stables, sans écrire de nouveau contenu :

| Donnée | Qui la commente |
|---|---|
| L'île de la semaine et le Colosse actif | Le capitaine Morgat, les Annonciateurs, l'Archiviste |
| Le top de la semaine, le champion de la saison | Les rumeurs d'auberge, la guide (« on dit que *X* plaît beaucoup à la princesse… »), le refus de fin de saison |
| Le cours de l'argent du roi | Le Trésorier, les courtiers, les débiteurs (« avec ce cours, je ne peux pas payer ! ») |
| La bénédiction active, la cagnotte | L'Oracle, les passants |
| La guilde du joueur, son domaine | Le Notaire de guilde, l'Intendant, les débiteurs qui craignent les guildes |
| La classe et le niveau du joueur | Sir Rowan, Hardouin, le ton des débiteurs |
| Le rang de Recouvreur | Les débiteurs, la Main Grise, les recouvreurs rivaux |
| La saison et les fêtes | La reine, la cour, les fêtes du château |

---

## 11. Mécaniques et lore

| Mécanique | Explication dans le monde |
|---|---|
| Score, classement, top de la semaine | Le renom consigné dans la Chronique ; un feuillet paraît chaque semaine |
| Saisons et remise à zéro | Un volume de la Chronique par saison ; la princesse refuse le champion et un nouveau volume s'ouvre |
| Ligues | Les rangs de l'Arène royale |
| Défi du roi et gardes du roi | Les gardes éprouvent les candidats |
| Guildes | Des compagnies sous charte de l'AGC |
| Îles hebdomadaires | Les affleurements des Îles Errantes, avec une traversée financée par la Couronne |
| Boss qui reviennent | Les Colosses ne meurent pas : on les rendort |
| Archiviste et classement des boss | Le registre des victoires sur les Colosses |
| Bénédictions | Les Pierres-Échos amplifient les offrandes collectives |
| Talismans | Des techniques célestrines gardées par les Liants |
| Enchantements | Les éclats célestrins de Mernil |
| Forge | Les Marteaux de Hardouin, et Hardouin seul pour le niveau 5 |
| Matériaux, ferraillage | L'économie de récupération de Ville Forte |
| Argent du roi, Bourse | Une monnaie fiduciaire manipulée par le Trésorier |
| Jetons | Les jetons de route de la Chancellerie |
| **Les créances (nouvelle mécanique)** | **Le Grand Livre de Liard** |
| Classes | Des voies martiales ; le paladin tient sa force d'un **serment à la Charte** plutôt que d'une foi divine |

---

## 12. Budget d'écriture

| Type de contenu | Vu combien de fois | Où va l'effort |
|---|---|---|
| Events et petits events (pools de variantes) | Des centaines de fois | **Priorité** : qualité, variantes, références au lore stable |
| Modèles de créances, de courrier, d'Échos | À l'infini | **Priorité** : écrits une fois, combinés par le système |
| Rumeurs, conseils, lignes du staff, vieilles pages du Livre | Des centaines de fois | Des fragments d'une ligne, idéaux pour le lore |
| Révélations | Une fois | Courtes : 2 à 4 étapes réutilisant l'existant, une scène, une entrée de carnet |
| Événements saisonniers | Une fois par an | Optionnels |

Concrètement, pour lancer le Grand Livre :
- environ 11 modèles de résolution, avec 3 variantes par issue ;
- environ 30 débiteurs nommés (des personnages existants) avec une ou deux répliques par tempérament ;
- environ 60 motifs d'une ligne ;
- environ 40 vieilles pages d'une ligne.

Le tout est réutilisable indéfiniment.

---

## 13. Migration du texte existant

### 13.1 À réécrire (religion structurée)

| Clé | Aujourd'hui | Proposition |
|---|---|---|
| `events:43.possibilities.shelter.text` | « S'abriter dans une église Kyutiste. » | « S'abriter dans un relais de la Garde. » |
| `events:43.possibilities.shelter.outcomes.0` à `.3` | Église, prêtre jovial, Askeriel, l'« Ode aux Trois », Y'ahnor | Un relais de la Garde des routes : soupe, veillée de contes, « ces bêtes viennent des îles ». Y'ahnor devient « une bête des îles ». |
| `events:26.text` | Une pendaison pour « propos contraires aux valeurs de l'Église » | Une pendaison pour « propos séditieux contre la Charte », ordonnée par un seigneur du Parti des Lignées |
| `events:28` | Des hommes « prêchant la parole des dieux » | Les Annonciateurs (« les îles vont s'écraser ! ») |
| `events:63` (`helpThem.outcomes.2/3`, `faceThem.outcomes.2`, `warnEveryone.outcomes.1`) | Une secte qui sacrifie à un démon ; des « hérétiques » | La Main Grise et sa rumeur de démon ; un témoin à faire taire |
| `smallEvents:staffMember.members.Draft` | « ancien dieu créateur du monde » | « l'Architecte, cartographe légendaire… » |
| `smallEvents:staffMember.members.Kyusaki` | « premier Grand prêtre du Kyutisme » | « fondateur de la Voie du Souffle… » |
| `smallEvents:staffMember.members.Ines` | « Fidèle partisane du Kyutisme » | « compagne d'armes de Kyusaki » |
| `smallEvents:staffMember.members.Hitori` | « où se cachent les Dieux » | « où se cachent les trésors des Célestrins » |
| `models:map_locations.15.description` | « l'ancienne déesse » | « l'ancienne cité des Célestrins » |
| `models:map_locations.1103` (nom et description) | « Portes sacrées », « une divinité » | « Portes Scellées », construites par les Célestrins |
| `models:monsters.celestialGuardian.description` | « Le gardien des portes sacrées » | « Automate célestrin, gardien des Portes Scellées » |

### 13.2 À ajuster pour le présent permanent

| Clé | Problème | Proposition |
|---|---|---|
| `smallEvents:interactOtherPlayers.beaten_leviathan.2` | Le Léviathan réduit au silence « à jamais », alors qu'il revient chaque semaine | « …qui a rendormi le Léviathan au niveau… » |
| Events d'attentat contre la famille royale (82, 89) | Répétés chaque semaine, ils sonnent faux s'ils sont présentés comme un événement unique | Les présenter comme l'une des innombrables tentatives de la Main Grise, que la Garde déjoue (R5) |
| Tout nouveau texte | — | Appliquer le test de la 100e lecture |

### 13.3 Références légères conservées
Le prêtre de village qui offre son pain, « Oh mon dieu », la prière d'un passant, la cloche de chapelle du Village dévasté, les fours sacrés de Limoges, les esprits du folklore, les noms d'objets (Âme du démon, Festin des dieux…) et les figures de style de Talvar.

### 13.4 Optionnel (des mécaniques sont touchées)
- « Prier Dieu » (`fightPet.prayGod`) peut devenir « Implorer la chance ».
- Le groupe des « actions des dieux » peut devenir les « actions légendaires ».
- L'« Attaque divine » peut devenir l'« Attaque du serment ».
- La « foi divine » des paladins peut devenir le « serment » des paladins.
- Les références à la culture populaire (Zeus, Nayru, Midas, Icare, Pégase) peuvent être renommées ou assumées.

### 13.5 Contradictions avec le canon des lieux

Comparer chaque event au lieu où il se déclenche (annexe A) fait ressortir ces écarts dans `develop` :

| Event | Lieu | Le texte dit | Le jeu dit | Statut |
|---|---|---|---|---|
| 13 | Claire de Ville | « une petite bourgade », dont la forge et l'auberge semblent « abandonnées depuis des années » | Une grande ville marchande, avec un forgeron et la Halte des Braves | Corrigé par la branche du karma |
| 18 | Mergagnan | « La ville semble déserte, sans âme qui vive » | Une paisible ville, avec un port, des jardins et des boutiques | Corrigé par la branche du karma |
| 20 | Claire de Ville | « un village » | Une grande ville marchande | Corrigé par la branche du karma |
| 36 | Boug-Coton | Le village ne compte que deux commerces, une bijouterie et une auberge | Le menu de la ville propose un forgeron, une boutique générale et l'Auberge du Seigneur | Corrigé par la branche du karma |
| 63 | Boug-Coton | « la taverne locale », où l'on loue une chambre | La seule auberge est l'Auberge du Seigneur, luxueuse | Corrigé par la branche du karma |
| 35 | Mergagnan | Un « bar » et « son auberge », sans nom | L'auberge de Mergagnan est Au Coin du Feu | Corrigé par la branche du karma |
| 47 | Ville Forte | Un seigneur et son château intact, qu'on assiège | Une ruine d'une dizaine de maisons et de paysans | Corrigé par la branche du karma |
| 50 | Village Coco | « un petit hameau », des fruits que vous n'aviez jamais vus | Un village-oasis des nobles, dont les noix de coco sont réputées dans tout le pays | Corrigé par la branche du karma |
| 43 | Grand Axe | « Faisant route vers l'Est » | La destination suivante n'est pas encore choisie | Corrigé par la branche du karma |

---

## 14. Guide de style et checklist

- **Noms :**
  - la cour, en ancien français (Aubéric, Aliénor, Mélisende, Ermengarde) ;
  - les nains, aux sonorités nordiques (Talvar, Moltiar, Ysgerd) ;
  - les Célestrins, avec des finales en *-um* et *-ine* (Célestrum, Neigeline) ;
  - les gens des routes, avec des surnoms (Gorim le Brise-Fer, Gaspard-Jo) ;
  - les débiteurs anonymes, avec un métier et un lieu (« le meunier de l'Étendue »).
- **Longueurs cibles.** Une introduction fait 200 à 300 caractères : le lieu, la situation, l'accroche. Elle peut aller jusqu'à 400 quand elle pose ce que les choix utilisent (qui est le personnage, ce qu'il veut, ce qu'en pense le joueur) : couper ces éléments appauvrit l'event, comme pour Donia (event 69) et Parziter (event 76). Une issue fait 150 à 280 caractères. On garde un seul détail d'ambiance par texte.
- **Mots simples et courants.** Pas de vocabulaire rare pour faire « médiéval » (pavoisé, poterne, échauguette, oriflamme) ni d'expression inventée (« vexé jusqu'à la moustache »). Pas de mot à double sens qui fait trébucher (« régimes » pour des bananes).
- **Phrases courtes, une action par phrase**, pronoms sans ambiguïté. On relit à voix haute : si on bute, on réécrit. On évite les tournures qui font hésiter (« sans que vous ayez vu »).
- **Dans une issue, le décor se limite à ce qui sert l'action.** Les réactions des personnages restent plausibles : si une scène ne sert qu'à justifier un gain, on la simplifie.
- **Pas de montant dans le texte** (le jeu affiche les pièces, la vie et le temps perdu) et **pas de morale finale**.
- **Le mot suit le seuil.** Un « vétéran », un joueur « fort », c'est le premier dixième des joueurs réguliers, pas un niveau 60. L'échelle des seuils est dans le skill `write-event-texts`.
- **Montrer la condition, ne pas la nommer.** Au lieu de « Votre agilité vous permet d'éviter l'animal », écrire « Vous enjambez les poutres effondrées avant que le chien n'ait fait trois pas ». Pas de « votre aura », pas de « votre réputation » en ouverture.
- **Registre sobre.** Pas de « héros de légende », de « gratitude éternelle » ni de « noble quête ». Un point d'exclamation au plus par texte, et pas de points de suspension en fin d'introduction.
- **Pas de discours direct** (règle du dépôt, `.github/instructions/Draphtv1.instructions.md`) : ni guillemets, ni « dit-il », ni réplique entre apostrophes. Les paroles passent au style indirect (« Elle vous déconseille le sentier principal »). Les répliques citées entre guillemets dans ce document sont des notes de conception, pas des textes à reprendre tels quels.
- **Pas de dieu qui parle, pas de miracle avéré.** Il y a toujours une explication possible : la Résonance, une drogue, un escroc, un Écho.

**Checklist pour tout nouveau texte répétable :**
1. Est-il vrai à la 100e lecture, dans n'importe quel ordre ? (R1, R4)
2. Laisse-t-il l'état du monde intact ? (R2)
3. Si l'issue est aléatoire, s'explique-t-elle par un trait de caractère ? (R3)
4. Reste-t-il à échelle humaine ? (R5)
5. Peut-il lire une donnée du jeu plutôt qu'un fait figé ? (R6)
6. Touche-t-il un personnage ou un lieu nommé existant ?
7. Respecte-t-il le canon du lieu où il se déclenche (annexe A) ? Il faut vérifier la description, les seuls voisins qu'on peut supposer proches, et l'auberge et les boutiques de la ville, qui ne doivent pas être démenties par le menu affiché juste après. L'event ne doit pas non plus supposer la destination suivante.
8. Se lit-il sans buter, avec des mots simples, sans décor inutile ni réaction invraisemblable ?
9. Chaque seuil correspond-il au mot du texte, selon l'échelle des joueurs réguliers ?

---

## 15. Spécification technique (sur la base de `develop`)

Ces deux mécanismes s'appuient sur le système de quêtes déjà en place (journal dans `/missions`, quêtes *expeditionTalismans* et *seeds*). Ce système a deux propriétés qu'il faut conserver :
- la progression est **déduite de l'état du jeu** (`QUEST_PROGRESS_COMPUTERS` dans `Core/src/core/quests/Quests.ts`) ;
- les quêtes **ne donnent rien par elles-mêmes**.

### 15.1 Big events conditionnés par une étape de quête

**Données.** On ajoute un critère au déclencheur, dans `Core/src/data/events/BigEventTrigger.ts` :

```ts
export interface BigEventTrigger {
	mapId?: number;
	level?: number;
	date?: DateFormat;
	oncePer?: "year" | "month" | "week" | "day";
	mapAttributes?: string[];
	quest?: {
		id: QuestId;
		minStepsDone?: number; // the event joins the pool from this step on (the default use)
		maxStepsDone?: number; // optional: window event, kept rare (R2/R8)
		activeTemplate?: string; // optional: only while at least one open page uses this repeatable template (e.g. "cargo")
	};
}
```

Dans un event (`Core/resources/events/NN.json`) :

```json
"triggers": [{ "quest": { "id": "ledger", "minStepsDone": 5 } }]
```

**Vérification.** Dans `verifyTrigger`, on ajoute un `verifyQuest(trigger, player, cache)` qui lit la progression avec une nouvelle fonction exportée `getQuestProgress(player, questId)` dans `Quests.ts`. Aujourd'hui, `QUEST_PROGRESS_COMPUTERS` est privé.

**Performance.** `getAvailableEvents` boucle sur chaque event et chaque déclencheur. Il faut **mémoriser la progression par quête le temps d'un appel**, avec une `Map<QuestId, Promise<number>>` créée dans `getAvailableEvents` et passée à `verifyTrigger`. Sinon, la même requête est relancée pour chaque event.

**Comportement.** Un event avec `quest` et sans `mapId` reste un event « global » (`getEventsNotFiltered`) : il est simplement filtré par la condition de quête. On peut aussi combiner `quest` avec `mapId`, `oncePer` ou `level`.

**Tests.**
- Un cas « sous le seuil », un cas « au seuil » et un cas « fenêtre dépassée ».
- La validation des données d'events doit refuser un `quest.id` inconnu.

### 15.2 La quête infinie (horizon fuyant)

**Constantes** (`Lib/src/constants/QuestConstants.ts`) :
- ajouter `QUEST_IDS.LEDGER = "ledger"` ;
- `STEPS[ledger]` contient **uniquement les pages écrites à la main**, qui servent pour les libellés ;
- une configuration distincte décrit la croissance :

```ts
static readonly INFINITE_QUESTS = {
	[QUEST_IDS.LEDGER]: { chunkSize: 4, chunksAhead: 2 }
} as const;

/** Displayed step count: STEPS length for a finite quest, receding horizon for an infinite one */
static getDisplayedStepCount(questId: QuestId, stepsDone: number): number {
	const infinite = QuestConstants.INFINITE_QUESTS[questId];
	if (!infinite) {
		return QuestConstants.STEPS[questId].length;
	}
	return (Math.floor(stepsDone / infinite.chunkSize) + infinite.chunksAhead) * infinite.chunkSize;
}
```

C'est une fonction **pure, dans Lib**, que partagent Core et Discord. Il n'est donc pas nécessaire de changer `QuestProgress` ni les paquets.

**Core** (`Quests.ts`) :
- `computeLedgerProgress(player)` calcule `1 + créances soldées`, à partir de la table des créances (une page = une créance). Il n'utilise pas `countCompletedSteps`, qui suppose une liste finie. Les **pages ouvertes** (1 à 3, avec leur modèle) doivent aussi être lisibles, pour le critère `activeTemplate` des déclencheurs et pour l'affichage du journal.
- Le paquet de quête a besoin d'un champ optionnel en plus, par exemple `openSteps?: { pageNumber: number; debtId: number }[]`, puisque l'étape en cours n'est plus forcément unique. Les quêtes finies existantes ne le remplissent pas et gardent leur affichage actuel.
- L'ouverture d'une page supplémentaire vérifie le plafond (`MAX_OPEN_PAGES = 3`) dans une transaction, pour qu'un petit event et un big event simultanés ne dépassent pas la limite.
- `notifyQuestStepCompleted` ne passe plus par `indexOf(stepId)` pour cette quête, mais par un **numéro de page**.
- Quand `stepsDone` franchit un multiple de `chunkSize`, il faut envoyer en plus une notification « le Livre s'est épaissi ». Cela demande une nouvelle clé dans `notifications.quests`.

**Discord** (`Discord/src/utils/QuestUtils.ts`) :
- `getStepCount` passe par `QuestConstants.getDisplayedStepCount(questId, stepsDone)`.
- `isCompleted` renvoie toujours `false` pour une quête infinie, qui n'apparaît donc jamais dans « Quêtes terminées ».
- `formatOngoingQuest` affiche la liste des pages ouvertes (`openSteps`) au lieu d'une seule étape en cours quand le champ est présent.
- Pour `getStep(quest, index)`, si `index` dépasse les pages écrites, on utilise une clé procédurale, par exemple `commands:missions.quests.list.ledger.proceduralStep`, avec `{{pageNumber}}` et un titre pris dans un pool (`index % taille du pool`).

**Traductions** (`commands:missions.quests.list.ledger`) :
- `name`, `icon` et `description` ;
- `steps.<pageId>.label` et `.hint` pour les pages écrites ;
- `proceduralStep.label`, `proceduralStep.hint` et le pool de titres ;
- les « vieilles pages » d'une ligne.

**Tests.**
- Dans Lib, vérifier que `getDisplayedStepCount` est **toujours strictement supérieur** à `stepsDone`, sur `0..10 000`, et qu'il donne `1 → 8`, `4 → 12`, `8 → 16`.
- Adapter `QuestUtils.test.ts` et `QuestTranslations.test.ts`, puisque toutes les étapes ne sont plus dans `STEPS`.

### 15.3 Les créances elles-mêmes (à concevoir)

Il faudra un modèle persistant pour les créances : débiteur, motif, montant, modèle de résolution, état et page. Il faudra aussi un point d'entrée en jeu : un petit event « créance » sur la carte du débiteur, et un big event pour les modèles longs comme la Cargaison. Le calcul de progression du Livre ne fait que **lire** ces créances, comme les autres quêtes lisent les talismans ou le jardin.

### 15.4 Conditions sur les issues et karma (reprise de la branche `outcomerequirements`)

> **État au 20 novembre 2026.** La branche a été rebasée sur `develop` en local (worktree `Crownicles.worktrees/karma-rebase`, 66 commits repris et 2 commits d'adaptation). Elle compile, tous les tests passent, et elle est poussée. La passe d'allègement des 13 events est faite (295 textes réécrits) et les trois phrases listées plus bas sont corrigées. Il reste à fusionner `requirements` dans `condition`.

La branche `origin/outcomerequirements` (issues #629 et #3327) contenait 67 commits qui n'étaient pas sur `develop` :

| Contenu de la branche | État | Réutilisation |
|---|---|---|
| Conditions sur les issues d'un event (`requirements` : niveau, karma, vie, attaque, défense, vitesse, classe, type et rareté du familier, étape de campagne) | Codé et testé | **À porter**, pas à fusionner (voir ci-dessous) |
| Karma du joueur (colonne, `addKarma`, log, champ `karma` par issue, deux commandes de test) | Codé | À porter, avec de nouveaux numéros de migration |
| 13 big events réécrits (1, 2, 10 à 20) : 3 à 5 fois plus d'issues, environ 99 000 caractères contre 21 000 sur `develop` | Écrit | À récupérer : la structure et les issues sont bonnes, le texte est à alléger (voir plus bas) |
| 4 fichiers de tests (validation du JSON des events, issues, conditions, règles de traduction française) | Écrit | À porter en premier : ils protègent tous les lots suivants |

**Pourquoi porter plutôt que fusionner.** `develop` a avancé de 2 261 commits depuis. Une fusion donne 11 conflits, et les migrations de la branche (`028` côté jeu, `013` côté logs) sont largement dépassées (`develop` en est à `084` et `041`). Les commandes de boutique modifiées par la branche ont été supprimées de `develop`.

**Où brancher les conditions.** `develop` a déjà un champ `condition` sur les issues (`Core/src/data/events/PossibilityOutcomeCondition.ts`), vérifié dans `Core/src/core/report/ReportBigEventService.ts`. Il ne connaît aujourd'hui qu'un critère, `canAcceptPet`. Les critères de la branche doivent **étendre ce champ** au lieu d'introduire un second mécanisme `requirements` :

```ts
type Range = { min?: number; max?: number };

export interface PossibilityOutcomeCondition {
	canAcceptPet?: boolean;
	level?: Range;
	karma?: Range;
	health?: Range;
	attack?: Range;
	defense?: Range;
	speed?: Range;
	validClassIds?: number[];
	validPetTypeIds?: number[];
	petRarity?: Range;
	cookingLevel?: Range;
	materials?: { type?: string; rarity?: Range; ids?: number[]; quantity?: Range };
	enchantment?: { slot?: "weapon" | "armor"; types?: string[]; kinds?: string[]; level?: Range };
	weaponLevel?: Range;
	armorLevel?: Range;
	quest?: { id: QuestId; minStepsDone?: number; maxStepsDone?: number; activeTemplate?: string };
}
```

Les critères de cuisine, de matériaux, d'enchantement et d'amélioration de l'équipement sont codés sur la branche, dans `requirements`. Deux champs d'issue les complètent : `consumeMaterials` retire des matériaux du sac (l'issue n'est possible que si le joueur en a assez), `giveMaterials` en donne un au hasard parmi ceux qui passent les filtres. Le résultat affiché sous l'issue indique le matériau utilisé ou obtenu. Les repères mesurés en production sont dans la référence de l'atelier (`generators/event-rewrites/src/reference.md`).

Le critère `quest` est le même que celui des déclencheurs (15.1) : une issue peut ainsi n'exister que pour un Recouvreur, sans créer un event entier. C'est la façon la moins chère de faire réagir un event existant au Grand Livre.

**Le karma dans le lore.** Le karma devient la **réputation** : ce que la Chronique et les gens des routes retiennent de vos manières. Il se branche naturellement sur les créances : la Clémence l'augmente, l'intimidation et le Refus soldé par la force le font baisser, et les débiteurs réagissent à la réputation du Recouvreur (issues conditionnées par `karma`).

**Corrections à faire sur les textes de la branche** (le reste est compatible avec la bible) :

| Event | Clé | Problème | Correction |
|---|---|---|---|
| 13 | `helpCityGuards.outcomes.7` | « fervent adorateur d'Iatneh » (panthéon kyutiste) | « fervent admirateur de Sir Rowan », par exemple |
| 19 | `cook.outcomes.4` | « vous remerciez le Loup Fenrir » (panthéon kyutiste) | « vous remerciez la forêt » |
| 10 | `push.outcomes.5` | « promettre de ne plus jamais remettre les pieds dans la région » (règle R4) | « promettre de vous tenir tranquille » |
| 11, 13, 18, 20 | texte | Le texte de `develop` a changé depuis la branche | Reporter les corrections de `develop` dans la version réécrite |
| 13, 15 | JSON | Le fichier d'event a changé sur `develop` | Reprendre les changements de `develop` |

Ces corrections sont faites (le garde de l'event 13 doit maintenant sa patience aux leçons de Sir Rowan). Les expressions légères de ces textes (« que Dieu nous garde », « murmurer une prière », « forêt maudite ») restent : elles sont dans l'esprit voulu.

**Les noms introduits par la réécriture.** Les seuls personnages nouveaux sont le baron Almerac (event 18, ajouté en section 7.4) et le lien entre Sir Rowan et la garde de Claire de Ville (event 13). L'auberge de l'event 13 s'appelait « La Halte Dorée », alors que l'auberge de Claire de Ville est la Halte des Braves : le texte a été corrigé pour utiliser le nom du jeu. Les autres noms de lieux (Rivière Vacarme, Grand Axe, Forêt du Vieillard…) existaient déjà dans le lore.

**Cohérence avec les villes.** Les events 13, 15 et 20 se passent à Claire de Ville, et le 18 à Mergagnan. Ils se jouent à l'arrivée, juste avant le menu de la ville, et doivent donc s'accorder avec lui :
- La forge, l'auberge et le marché d'un event ne doivent pas contredire ceux du menu. Un forgeron qui refuse de vous servir ou une auberge qui vous met dehors sont démentis à l'écran suivant.
- Le texte doit respecter la description de la ville. Claire de Ville est « réputée pour son calme et son respect de l'ordre » : un garde véreux y fait contraste, mais elle n'est pas une ville sans loi.
- Les lieux nommés doivent être voisins sur la carte. Le Bois Hurlant borde Claire de Ville ; le Grand Axe et les marais en sont loin.
- Une issue qui envoie vers un type de carte (`mapTypesDestination`) doit trouver ce type parmi les voisins, sinon le rapport plante. Un test le vérifie maintenant pour tous les events.
- Un event de route ne suppose pas la destination suivante, que le joueur choisit après.

**Le texte de la branche est à alléger.** Mesuré sur les 13 events :

| Mesure | Branche karma | `develop`, mêmes events | `develop`, events 46 à 89 |
|---|---|---|---|
| Introduction (médiane) | 545 caractères | 126 | 408 |
| Issue (médiane) | 238 caractères | 133 | 281 |
| Issues qui commencent par « Votre… » ou « Vos… » | 44 % | 0 % | 2 % |
| Mots emphatiques pour 1 000 mots (*aura, sinistre, imposant, légende, noble, majestueux*…) | 4,3 | 0,7 | 0,7 |
| Introductions qui finissent par « … » | 8 sur 13 | 0 sur 13 | 9 sur 43 |

- **Les issues ont la bonne longueur** : elles sont plus courtes que celles des events récents.
- **Les introductions sont trop longues.** Elles ont été multipliées par quatre, et c'est le texte qu'un joueur relit le plus. Elles empilent les détails d'ambiance et finissent presque toutes sur des points de suspension.
- **Le style explique la mécanique.** Près d'une issue sur deux commence par « Votre réputation… », « Votre agilité… », « Votre aura sombre… » pour justifier la condition. À la dixième lecture, le gabarit se voit.
- **Le registre est gonflé** : « héros de légende », « gratitude éternelle », « noble quête ». Certaines issues enfreignent la règle R5 (un forgeron qui reconnaît en vous « un héros de légende »).
- **Il reste des fautes** : « votre vitesse et votre agilité vous permet », « Continuer votre route. en ignorant le chien. », « léchent ».

La reprise des events (lot 4) inclut donc une **passe d'allègement**, avec les cibles de la section 14. Elle est faite : l'introduction médiane fait maintenant 248 caractères, l'issue médiane 186, plus aucune issue ne commence par « Votre… » ou « Vos… », et les mots emphatiques sont tombés à 0,1 pour 1 000 mots.

**À noter.** L'event 18 réécrit raconte déjà un chantier abandonné à la mort du baron Almerac, avec des « intérêts impayés » et des registres laissés sur place. C'est une accroche toute faite pour le Grand Livre : Almerac devient un débiteur de la maison Liard.

---

## 16. Plan de mise en œuvre progressive

### Le principe : on ne réécrit pas tous les events

La bible est conçue comme une **couche d'interprétation** : la plupart des textes actuels restent vrais dans le nouveau lore. Sur les 88 big events (environ 279 000 caractères) :

| Catégorie | Events | Travail d'écriture |
|---|---|---|
| **Contredisent le nouveau lore** (religion structurée) | 26, 28, 43, 63 | Obligatoire, mais petit : environ 15 textes |
| **Déjà réécrits** sur la branche karma | 1, 2, 10 à 20 (13 events) | Trois phrases à corriger et une passe d'allègement (pas de réécriture) |
| **Portent un personnage nommé** (Price, Gruffo, Pérotin, Donia, Xirtex, le roi, la princesse…) | 26 events | Rien d'obligatoire. Retouches d'ancrage quand on y passe. |
| **Les autres** | 45 events | Rien d'obligatoire |

La réécriture complète de l'issue #3327 (enrichir chaque event avec des issues conditionnées) reste un chantier de fond, à mener au rythme voulu : aucun lot ne l'attend.

**Règle du passage.** Dès qu'on touche un event pour une autre raison (bug, équilibrage, nouvelle issue), on lui applique la checklist de la section 14. Le lore se diffuse ainsi sans chantier dédié.

### Les lots

Chaque lot est une petite PR livrable seule. Les lots 0, 1 et 5 ne dépendent de rien ; le reste suit les dépendances indiquées.

| Lot | Contenu | Écriture | Code | Dépend de |
|---|---|---|---|---|
| **0. Garde-fous** | Tests de la branche karma : validation du JSON des events, règles de traduction française. **Fait par le rebase** ; deux règles typographiques sont en attente (apostrophes courbes, tirets longs). | Aucune | Fait | — |
| **1. Purge de la religion** | Section 13.1 : events 26, 28, 43, 63, quatre lignes du staff, deux lieux, un monstre. Section 13.2 : le Léviathan « rendormi ». | Environ 20 textes | Aucun | — |
| **2. Moteur de conditions** | Les critères fonctionnent sur la branche rebasée sous le nom `requirements`. Reste à les fusionner dans `condition` (15.4). | Aucune | Petit | 0 |
| **3. Karma** | Colonne, log, champ `karma` par issue, commandes de test, migrations renumérotées, export RGPD. **Fait par le rebase.** | Aucune | Fait | 2 |
| **4a à 4d. Events de la branche** | Par paquets : (1, 2, 10), (11, 12, 13), (14, 15, 16, 17), (18, 19, 20). **Fait.** Le JSON et le texte sont repris par le rebase et adaptés aux séjours en ville ; les corrections de 15.4 et la passe d'allègement sont faites. | Fait : 13 introductions et 282 issues ou libellés réécrits | Fait | 3 |
| **5. Quêtes et events** | Déclencheur `quest` sur les big events (15.1) et quête à horizon fuyant (15.2) | Aucune | Moyen | — |
| **6. Grand Livre, version minimale** | Table des créances, 3 modèles (Comptant, Cargaison, Refus), 10 débiteurs, 20 motifs, 8 pages écrites | Environ 60 textes courts | Gros | 5 |
| **7. Grand Livre, par ajouts** | Un modèle, quelques débiteurs ou quelques pages par PR. Plusieurs pages ouvertes. Big events débloqués. | Quelques textes par PR | Petit | 6 |
| **8. Fond de roulement** | Events 21 à 89 de l'issue #3327, deux ou trois par PR | Au rythme voulu | Aucun | 2 |

**Ordre conseillé pour le lot 8.** D'abord les events à personnage nommé, parce qu'ils portent le lore et que des issues conditionnées par le Livre ou le karma y ont le plus d'effet : 39, 82 et 89 (Price), 46 (Pérotin), 56 et 58 (Gruffo), 69 (Donia), 71 (Xirtex), 40 et 51 (Xetrix, Lucya), 83 (la sorcière), 30 (Benatis), 76 (Parziter). Ensuite les autres, dans l'ordre de l'issue.

**Ce qui est déjà acquis après les lots 0 à 4.** La religion structurée a disparu, 13 events sont enrichis, le moteur de conditions et le karma sont en place, et il n'y a eu qu'une vingtaine de textes à écrire, plus la passe d'allègement des 13 events repris. Tout le reste du lore (noms, secrets, Grand Livre) s'ajoute ensuite sans rien casser.

---

## 17. Questions ouvertes

1. Le **nom de la mécanique de créances** et du titre du joueur : Grand Livre, Recouvreur, Huissier des routes ?
2. Le **dernier Liard** : faut-il un mystère éternel, ou une révélation (il est caché parmi les personnages connus, sous les traits d'Aldéric, par exemple) ?
3. La **commission** : de l'argent seulement, ou aussi une monnaie propre au Livre (« sceaux de recouvrement ») à dépenser chez Anselme ?
4. Les **dettes entre joueurs** : peut-on un jour voir le nom d'un autre joueur dans le Livre, par exemple quand un joueur s'endette en ville ?
5. Faut-il garder le mot **« bénédiction »** ?
6. Les noms **Hautecouronne** et **Île des Marées** te conviennent-ils ?
7. Quelles **autres lignes infinies** prioriser après le Livre (Courrier, Échos, Fragments) ?
8. Les **réglages de l'horizon fuyant** : des cahiers de 4 pages avec 2 cahiers d'avance (`1/8 → 4/12`), ou un rythme plus lent (cahiers de 8, `1/16`) ?
9. Les **events en fenêtre** (`maxStepsDone`) : faut-il les réserver strictement aux révélations, ou en autoriser quelques autres ?

---

<!-- canon:start -->

## Annexe A. Canon des lieux (généré depuis `develop` @ `83016fe7b`)

> Généré par `generators/lore-graph/canon.py` : ne pas modifier à la main, relancer le script.
> Les descriptions, les voisins, les villes et leurs auberges sont **canon** : un texte peut ajouter des détails, jamais les contredire.
> Les voisins sont les seuls lieux qu'un event peut supposer proches, avec le temps de trajet du jeu. La ligne « rattachés dans le graphe » vient de l'extraction du lore et sert de rappel, pas de canon.

### A.1 Les villes et leur menu

Quand le joueur arrive dans une ville, le big event éventuel se joue **avant** le menu de la ville, qui s'ouvre juste après avec ce texte commun :
« Les rues pavées s'animent autour de vous : marchands, aventuriers et artisans vaquent à leurs occupations. De nombreux services s'offrent à vous, mais la route, elle, n'attend personne. »

Tout ce que ce menu affiche est canon pour la ville : un event qui s'y déclenche ne doit ni le nier, ni le rendre absurde à l'écran suivant.

| Ville | Carte | Auberge | Services | Boutiques | Prix d'un logis |
|---|---|---|---|---|---|
| Boug-Coton | `6` | L'Auberge du Seigneur | Aller chez le forgeron | Boutique générale | 6 000 |
| Ville Forte | `10` | La Chope Sanglante | Aller chez le forgeron, Rencontrer le ferrailleur | Boutique générale, Le Marchand de matériaux | 9 000 |
| Village Coco | `17` | La Gorgée Brûlante | aucun | Boutique générale, L'Herboriste, Le Bûcheron | 50 000 |
| Claire de Ville | `23` | La Halte des Braves | Aller chez le forgeron | Boutique générale, La Bourse, Le Vétérinaire | 12 000 |
| Mergagnan | `26` | Au Coin du Feu | Aller chez le forgeron | Boutique générale, Le Tanneur, Le Vétérinaire | 18 000 |
| Cour du Château | `41` | Le Pavillon Royal | Rencontrer le forgeron royal, Consulter l'archiviste des îles | Marché royal, Boutique générale | 25 000 |

Le prix d'un logis classe les villes de la plus modeste à la plus convoitée : un event peut s'en servir pour le ton (Boug-Coton est la moins chère, Village Coco la plus chère).

**Dans toutes les villes :**
- **Aller voir le notaire** : « Vous entrez dans le bureau d'un notaire, une personne chargée de gérer les transactions immobilières. Il vous accueille chaleureusement et examine votre dossier avant de vous proposer ses services. » Il vend les maisons et les logis de rente : « Un logis à céder dans cette ville […]. Une fois en votre possession, il vous servira de point d'attache si votre maison est loin ou vous pourrez percevoir une rente si vous avez déjà une demeure proche. »
- **L'auberge** : « Une odeur alléchante et des éclats de rire s'échappent de l'établissement. L'endroit idéal pour reprendre des forces. »
- **Sortir de la ville** ou **Rester en ville**.

**Selon le joueur :**
- Sa maison (« Un havre de paix vous attend derrière cette porte, avec tout le confort nécessaire pour préparer vos prochaines aventures. ») ou son logis (« Votre logis de rente vous tient lieu de pied à terre dans cette ville. Vous pourrez y dormir, y conserver vos affaires et y préparer un repas, comme si vous étiez à la maison. »), si la ville en a un à lui.
- **Domaine de guilde**, dans la seule ville choisie par sa guilde : « Les bannières de **la guilde** flottent au-dessus des murs d'enceinte du domaine. L'activité y bat son plein. »
- **Ravitaillement de guilde** : « Un marchand itinérant propose de la nourriture pour familiers, réglée sur la trésorerie de votre guilde. »

**Selon le jour :**
- **Aller voir l'enchanteur** : « Un voyageur aux mains couvertes d'enchantements lumineux attire votre attention. Il prétend pouvoir enchanter n'importe quelle arme ou pièce d'armure, et en effacer les enchantements sans rien demander en retour. » C'est **Mernil**, un enchanteur itinérant et hautain. Une tâche quotidienne le place chaque jour dans une ville tirée au hasard : aucun texte ne doit le fixer dans une ville.

**Services et boutiques, tels que le menu les décrit :**

- **Aller chez le forgeron** (Boug-Coton, Ville Forte, Claire de Ville, Mergagnan) : « Le son régulier de l'enclume résonne depuis la forge. Le forgeron peut renforcer vos équipements ou déplacer leurs enchantements de l'un à l'autre. »
- **Consulter l'archiviste des îles** (Cour du Château) : « Sous les voûtes du château, un archiviste rassemble les récits des aventuriers ayant triomphé des plus redoutables créatures des îles mystérieuses. »
- **Rencontrer le forgeron royal** (Cour du Château) : « Une silhouette imposante travaille un métal brûlant sous les bannières du château. On murmure qu'il est le seul à savoir forger des pièces de niveau 5. »
- **Rencontrer le ferrailleur** (Ville Forte) : « Gorim le Brise-Fer démonte les équipements de réserve pour les convertir en matériaux. »
- **Marché royal** (Cour du Château) : « La boutique privée du château regorge de trésors exclusifs. On y échange gemmes contre or et objets rares. Un érudit au regard perçant y tient les registres des quêtes du royaume, et peut troquer une quête qui vous échappe contre une autre, plus à votre goût. »
- **Boutique générale** (Boug-Coton, Ville Forte, Village Coco, Claire de Ville, Mergagnan, Cour du Château) : « Un étalage coloré déborde de potions scintillantes et d'équipements singuliers. La sélection change chaque jour. »
- **La Bourse** (Claire de Ville) : « Des courtiers s'affairent devant de grands tableaux de cours en perpétuel mouvement. On peut y acquérir un prestigieux badge de fortune ou commander une étude de marché anticipant les tendances de l'argent du roi et des prix des plantes. »
- **Le Tanneur** (Mergagnan) : « L'odeur du cuir fraîchement tanné flotte dans l'air. Cet artisan fabrique des sacoches qui agrandissent votre inventaire. »
- **L'Herboriste** (Village Coco) : « Des rangées de plantes soigneusement cultivées garnissent l'échoppe parfumée. La sélection est renouvelée chaque semaine. »
- **Le Bûcheron** (Village Coco) : « Un colosse taillé comme un chêne empile des bûches devant son étal. Son bois est réputé pour alimenter les fourneaux. »
- **Le Vétérinaire** (Claire de Ville, Mergagnan) : « Un praticien attentionné examine les familiers et peut leur redonner de l'affection s'ils en manquent. »
- **Le Marchand de matériaux** (Ville Forte) : « Un négociant baroudeur étale des caisses de matériaux récupérés aux quatre coins du royaume. Ses lots sont variés mais le contenu reste une surprise. »

### A.2 Le continent

Big events possibles sur tous ces lieux (déclencheur `mapAttributes: continent1`) : 64, 74, 80.

#### Plage Sentinelle · `1`

- **Type :** plage (`be`) ; biomes : coast
- **Description du jeu :** « Une grande plage de sable fin au bord de la ville. »
- **Voisins :** Mergagnan (1 h)
- **Zones d'expédition des familiers :** les Récifs Mystérieux de la Plage Sentinelle
- **Big events qui s'y déclenchent :**
  - 49 : « Après vous être baladé plusieurs minutes sur la plage vous croisez une étrange petite créature, c'est un bernard-l'hermite ! »
  - 56 : « Vous approchez la Plage Sentinelle, l'air frais emplit vos poumons et l'odeur iodée de la mer atteint vos narines. »
  - 75 : « En arrivant à la plage sentinelle, vous apercevez, amarré, un bateau aux voiles noires et usées. »
- **Rattachés dans le graphe :** Gruffo, Le capitaine pirate au tricorne

#### Voie champêtre · `2`

- **Type :** route (`ro`) ; biomes : plains
- **Description du jeu :** « Une petite route qui permet de se rendre à la campagne à partir de Mergagnan et inversement. »
- **Voisins :** Mergagnan (2 h), Le Berceau (2 h)
- **Zones d'expédition des familiers :** les Sentiers Secrets de la Voie Champêtre
- **Big events qui s'y déclenchent :**
  - 5 : « Vous avez trouvé une fontaine ! »
  - 33 : « Vous arrivez dans une ferme où se déroule un grand festin. »

#### Le Berceau · `3`

- **Type :** plaine (`pl`) ; biomes : plains
- **Description du jeu :** « Grande plaine de l'ouest de la contrée bordée d'une grande forêt et traversée par une grande route. »
- **Voisins :** Voie champêtre (2 h), Grande Rue (3 h), Forêt Du Vieillard (4 h)
- **Zones d'expédition des familiers :** les Prairies Cachées du Berceau
- **Big events qui s'y déclenchent :**
  - 9 : « Au milieu d'un champ, vous rencontrez un paysan. »
  - 22 : « Alors que vous traversez la propriété d'un fermier, vous voyez un pommier aux fruits forts appétissants. »

#### Forêt Du Vieillard · `4`

- **Type :** forêt (`fo`) ; biomes : forest
- **Description du jeu :** « Immense forêt au sud du Berceau. On raconte que beaucoup de voyageurs s'y sont perdus. »
- **Voisins :** Chemin du Dédale (3 h), Le Berceau (4 h)
- **Zones d'expédition des familiers :** les Profondeurs de la Forêt du Vieillard
- **Big events qui s'y déclenchent :**
  - 1 : « Un arbre est tombé sur le chemin et bloque le passage ! »
  - 32 : « Vous continuez votre chemin tranquillement dans une forêt, lorsque vous entendez un cri. »
  - 69 : « Alors que vous traversez la Forêt du Vieillard, une femme magnifique s'approche en courant. »
- **Rattachés dans le graphe :** Donia

#### Chemin du Dédale · `5`

- **Type :** route (`ro`) ; biomes : forest, ruins
- **Description du jeu :** « Chemin tirant son surnom de son sillonement au sein de la nature foisonnant du sud de la forêt du vieillard. Sous la végétation se devinent encore les murets d'un ancien labyrinthe oublié. »
- **Voisins :** Boug-Coton (3 h), Forêt Du Vieillard (3 h)
- **Zones d'expédition des familiers :** les Sous-bois Sinueux du Chemin du Dédale, les Labyrinthes Oubliés du Chemin du Dédale
- **Big events qui s'y déclenchent :**
  - 31 : « Vous entendez un bruit de galop au loin. »
  - 42 : « Au détour d'un chemin, une jeune femme apparaît. »
  - 85 : « Vous vous engagez dans un corridor bordé de parois rocheuses couvertes de mousse. »

#### Boug-Coton · `6`

- **Type :** village (`vi`) ; biomes : cave
- **Description du jeu :** « Un village paisible réputé pour son auberge accueillante. Sous l'auberge s'étendent de vastes caves secrètes creusées à même la roche. »
- **Voisins :** Cour du Château (2 h), Chemin du Dédale (3 h), Mergagnan (5 h), Vallée des Rois (7 h)
- **Zones d'expédition des familiers :** les Caves Secrètes de Boug-Coton
- **Auberge :** L'Auberge du Seigneur : « Vous entrez dans l'Auberge du Seigneur. Ici, tout est luxueux, du mobilier aux boissons. Vous pouvez y trouver des aventuriers de renom et des nobles en quête de sensations fortes. Vous avez même déjà entendu dire que le Roi y avait séjourné lors de ses voyages. »
  - au menu : Pain et fromage, Volaille rôtie, Boeuf rôti, Ragoût, Tourte du Seigneur ; chambres : Chambre Simple, Chambre Confortable, Chambre de Luxe
- **En ville :** services : Aller chez le forgeron ; boutiques : Boutique générale
- **Big events qui s'y déclenchent :**
  - 36 : « Au cours de votre très long périple, vous arrivez aux abords d'un petit village fort charmant. »
  - 46 : « En passant dans un petit village, vous tombez sur le plus célèbre ménestrel connu dans la région et au-delà des frontières, nommé Pérotin. »
  - 52 : « Alors que vous faites étape à Boug-Coton, vous êtes interpellé par des enfants vous demandant de jouer avec eux. »
  - 54 : « Vous apercevez le village Boug-Coton et décidez de vous y rendre. »
  - 63 : « Au bout d'un certain temps, vous arrivez enfin dans le village de Boug-Coton où une rumeur court que des créatures maléfiques sont à l'œuvre... »
- **Rattachés dans le graphe :** L'Auberge du Seigneur, Le chevalier étranger, Le démon des encapuchonnés, Le Forgeron, Les encapuchonnés de Boug-Coton, Lucya

#### Vallée des Rois · `7`

- **Type :** désert (`de`) ; biomes : desert, ruins
- **Description du jeu :** « Désert de sable chaud nommé en l'honneur des anciens rois de la région. Leurs tombeaux à demi ensevelis parsèment encore les dunes. »
- **Voisins :** Boug-Coton (7 h), Croisement des Destins (8 h), Village Coco (9 h), Cour du Château (9 h), La Dune (10 h)
- **Zones d'expédition des familiers :** les Dunes Brûlantes de la Vallée des Rois, les Tombeaux Oubliés de la Vallée des Rois
- **Big events qui s'y déclenchent :**
  - 48 : « Vous êtes à la recherche d'un artéfact. »
  - 71 : « Alors que vous traversez la Vallée des Rois, vous apercevez une oasis. »
  - 88 : « Le sable brûlant s'enfonce sous vos pas tandis que vous progressez difficilement, le foulard serré sur le visage pour filtrer le vent chaud chargé de poussière. »
- **Rattachés dans le graphe :** Les anciens rois de la région, Les nobles de la Vallée des Rois, Xirtex

#### Croisement des Destins · `8`

- **Type :** route (`ro`) ; biomes : plains
- **Description du jeu :** « Un très grand carrefour qui relie les principaux chemins à l'ouest du Mont Célestrum. »
- **Voisins :** Ville Forte (2 h), Mont Célestrum (7 h), Vallée des Rois (8 h)
- **Zones d'expédition des familiers :** les Passages Mystiques du Croisement des Destins
- **Big events qui s'y déclenchent :**
  - 19 : « Après de longs jours sans avoir pu vous sustenter, vous voyez sur le bord du chemin un cadavre de renard, semblant tout frais. »
  - 25 : « Après plusieurs jours de voyage sans encombre, vous finissez par arriver sur les lieux d'une petite escarmouche entre deux groupes armés. »

#### Grande Rue · `9`

- **Type :** route (`ro`) ; biomes : plains, ruins
- **Description du jeu :** « Ancienne grande route commerciale reliant le Berceau et Ville forte, il ne reste de la Grande Rue que de vieux pavés ébréchés. »
- **Voisins :** Ville Forte (1 h), Le Berceau (3 h), Grand Axe (3 h)
- **Zones d'expédition des familiers :** les Bas-côtés de la Grande Rue, les Pavés Anciens de la Grande Rue
- **Big events qui s'y déclenchent :**
  - 2 : « Devant vous, un chien arrive et tourne autour de vous. »
  - 38 : « Faisant route, vous croisez un marchand itinérant, qui vous interpelle. »

#### Ville Forte · `10`

- **Type :** village (`vi`) ; biomes : ruins, cave
- **Description du jeu :** « Ancienne grande ville fortifiée, Ville Forte n'est plus que l'ombre d'elle-même. Ravagée par l'ancienne guerre, il ne reste qu'une dizaine de maisons et de paysans. Le reste des anciennes fortifications est en ruines, et sous les remparts effondrés, d'anciennes galeries souterraines s'enfoncent dans la roche. »
- **Voisins :** Grande Rue (1 h), Croisement des Destins (2 h)
- **Zones d'expédition des familiers :** les Catacombes Perdues de Ville Forte, les Remparts Effondrés de Ville Forte
- **Auberge :** La Chope Sanglante : « Vous entrez dans la Chope Sanglante, une auberge réputée pour ses boissons fortes et son ambiance sombre. Vous y trouvez beaucoup de trophées de monstres chassés par les clients, et un air chargé de l'odeur de la bière et du tabac. La nourriture n'y est pas de grande qualité, et les lits non plus d'ailleurs. »
  - au menu : Pain, Bretzels, Salade simple ; chambres : Chambre Horrible, Chambre Commune
- **En ville :** services : Aller chez le forgeron, Rencontrer le ferrailleur ; boutiques : Boutique générale, Le Marchand de matériaux
- **Big events qui s'y déclenchent :**
  - 7 : « Parmi les ruines de Ville Forte, vous découvrez une maison encore debout. »
  - 26 : « En arrivant dans un village, vous remarquez un regroupement de personnes. »
  - 47 : « Vous êtes tellement épuisé que vous avez du mal à marcher. »
- **Rattachés dans le graphe :** Gorim le Brise-Fer, La Chope Sanglante, Le Forgeron, Le Marchand de matériaux

#### Grand Axe · `11`

- **Type :** route (`ro`) ; biomes : plains
- **Description du jeu :** « Dernière vraie route qui permet encore de contourner le Mont Célestrum par le nord, le grand axe est encore très utilisé aujourd'hui, principalement par les brigands. »
- **Voisins :** Grande Rue (3 h), L'Étendue (3 h)
- **Zones d'expédition des familiers :** les Embuscades du Grand Axe
- **Big events qui s'y déclenchent :**
  - 17 : « Affamé par votre journée de voyage, vous décidez de faire une halte et de rechercher de quoi vous nourrir autour de vous. »
  - 43 : « Faisant route vers l'Est en pleine nuit, vous marchez. »
- **Rattachés dans le graphe :** Brigands et hors-la-loi

#### L'Étendue · `12`

- **Type :** plaine (`pl`) ; biomes : plains
- **Description du jeu :** « Une grande plaine vide nordique sans grand intérêt. »
- **Voisins :** Grand Axe (3 h), Route Marécageuse (4 h), Lac Mirage (6 h), Mont Célestrum (10 h)
- **Zones d'expédition des familiers :** les Plaines de l'Étendue
- **Big events qui s'y déclenchent :**
  - 14 : « Alors que la fatigue commence à vous assaillir, vous découvrez une petite prairie où se tient une petite maison. »
  - 62 : « Un paysan vous hèle au devant de sa ferme située aux abords de l'Étendue. »
- **Rattachés dans le graphe :** Le paysan à la fourche

#### Route Marécageuse · `13`

- **Type :** route (`ro`) ; biomes : swamp
- **Description du jeu :** « Un chemin difficile d'accès, boueux et humide. La Route Marécageuse relie l'Étendue à la Rivière aux crabes. »
- **Voisins :** Rivière aux Crabes (3 h), L'Étendue (4 h)
- **Zones d'expédition des familiers :** les Marécages Maudits de la Route Marécageuse
- **Big events qui s'y déclenchent :**
  - 28 : « Pendant votre périple, un groupe d'hommes "prêchant la parole des dieux" vous invite à rejoindre leur cause. »
  - 58 : « Après de longues heures de marche au travers de la route marécageuse, vous croisez une femme à un carrefour. »
- **Rattachés dans le graphe :** Gruffo, L'esprit chasseur de bonneteurs, symsym

#### Lac Mirage · `14`

- **Type :** lac (`la`) ; biomes : coast, swamp
- **Description du jeu :** « Un grand lac où les familles aiment bien se réunir. La rivière Vacarme vient s'y jeter, et ses rives les plus reculées se perdent en marécages couverts de roseaux. »
- **Voisins :** Chemin aux Loups (3 h), Bois Hurlant (3 h), Rivière aux Crabes (5 h), L'Étendue (6 h)
- **Zones d'expédition des familiers :** les Rives Paisibles du Lac Mirage, les Roselières Brumeuses du Lac Mirage
- **Big events qui s'y déclenchent :**
  - 10 : « Alors que vous passiez près d'un plan d'eau, vous remarquez un homme qui semble en difficulté sur sa partie de pêche ! »
  - 53 : « Alors que vous passez au bord du lac Mirage, vous remarquez un homme vous faisant signe d'un peu plus loin. »
  - 86 : « Après une longue marche éreintante, vous débouchez sur une clairière silencieuse où s'étend un vaste plan d'eau aux reflets changeants. »
- **Rattachés dans le graphe :** Le coursier épuisé

#### Mont Célestrum · `15`

- **Type :** montagne (`mo`) ; biomes : mountain, cave
- **Description du jeu :** « Le Mont Celestrum est la montagne dominante de la région. Haute de plusieurs kilomètres, Celestrum est visible de tous. On raconte qu'elle porte le nom de l'ancienne déesse. Par ailleurs, une seule personne est parvenue à grimper jusqu'au sommet. On ne retient d'elle que ses initiales : M-B. Ses flancs sont percés de grottes dont personne n'a jamais trouvé le fond. »
- **Voisins :** Forêt Célestrum (5 h), Croisement des Destins (6 h), Chemin aux Loups (8 h), L'Étendue (8 h)
- **Zones d'expédition des familiers :** les Grottes sans Fond du Mont Célestrum, les Sommets Enneigés du Mont Célestrum
- **Big events qui s'y déclenchent :**
  - 8 : « Vous avez décidé de profiter de l'été pour passer par les montagnes tant que les cols ne sont pas trop enneigés. »
  - 21 : « En continuant votre périple, vous arrivez devant un pont délabré qui, de plus, est au dessus d'un énorme gouffre. »
  - 51 : « Alors que vous atteignez le pied du Mont Célestrum, vous repérez un escalier tortueux, taillé dans le flanc gauche du Mont. »
- **Rattachés dans le graphe :** Femme de Talvar, L'esprit chasseur de bonneteurs, Les nains du Mont Célestrum, Lucya, M-B, Moltiar, Talvar, Xetrix

#### Chemin aux Loups · `16`

- **Type :** route (`ro`) ; biomes : plains
- **Description du jeu :** « Petit chemin dangereux bordant la rivière Vacarme. Attention à ne pas tomber. »
- **Voisins :** Village Coco (3 h), Lac Mirage (3 h), Mont Célestrum (9 h)
- **Zones d'expédition des familiers :** les Tanières du Chemin aux Loups
- **Big events qui s'y déclenchent :**
  - 30 : « Vous apercevez un château au loin, vous décidez de vous en approcher par l'entrée principale. »
  - 55 : « Sans doute à cause de la rude tempête d'hier, un arbre est tombé sur le petit sentier de forêt où vous marchez. »

#### Village Coco · `17`

- **Type :** village (`vi`) ; biomes : desert
- **Description du jeu :** « Village-oasis prisé par les nobles de la Vallée des Rois en quête de fraîcheur. Les noix de coco qu'on y récolte sont réputées dans tout le pays et s'échangent à prix d'or sur les marchés du royaume. La rareté des terrains constructibles autour de la source en fait l'un des lieux les plus convoités. »
- **Voisins :** Rivière Vacarme (2 h), Chemin aux Loups (3 h), Forêt Célestrum (5 h), Vallée des Rois (9 h)
- **Zones d'expédition des familiers :** les Oasis Cachées du Village Coco
- **Auberge :** La Gorgée Brûlante : « Vous entrez dans la Gorgée Brûlante, une petite auberge de village où il fait bon se rafraichir, contrairement à ce que laisse penser son nom. Sa désignation vient de la boisson phare de l'établissement, une bière épicée qui réchauffe le cœur et l'âme. Les murs sont décorés de souvenirs de voyageurs passés, et l'atmosphère est chaleureuse. »
  - au menu : Poisson et frites, Ragoût de légumes froid, Porc rôti, Plateau d'huîtres, Tamale ; chambres : Chambre Simple, Chambre Confortable, Chambre de Luxe
- **En ville :** services : aucun ; boutiques : Boutique générale, L'Herboriste, Le Bûcheron
- **Big events qui s'y déclenchent :**
  - 27 : « En arrivant dans un petit village, vous remarquez un puits avec un petit objet brillant au fond. »
  - 34 : « À votre arrivée au village, des passants vous reconnaissent et vous abordent. »
  - 45 : « En arrivant aux abords d'un village animé, vous entendez un groupe de personnes parler d'un sanctuaire qui serait hanté. »
  - 50 : « Lors de votre périple, vous atteignez un petit hameau du nom de village Coco, il fait très chaud et vous avez besoin de vous reposer. »
- **Rattachés dans le graphe :** L'Herboriste, La Gorgée Brûlante, Le Bûcheron, Les nobles de la Vallée des Rois

#### Rivière Vacarme · `18`

- **Type :** rivière (`ri`) ; biomes : coast
- **Description du jeu :** « Cette rivière doit son nom au bruit produit par son fort courant qui a fait perdre la vie à de nombreux villageois. »
- **Voisins :** La Dune (1 h), Village Coco (2 h), Bois Hurlant (4 h)
- **Zones d'expédition des familiers :** les Rapides Tumultueux de la Rivière Vacarme
- **Big events qui s'y déclenchent :**
  - 12 : « Vous voyez une rivière devant vous. »
  - 44 : « Lors de votre long périple, vous vous retrouvez au bord d'une large rivière. »

#### La Dune · `19`

- **Type :** plage (`be`) ; biomes : desert, coast
- **Description du jeu :** « Plage créée par les forts vents de la Vallée des Rois. La Dune protège les terres voisines de la chaleur et amène l'eau de la rivière Vacarme. »
- **Voisins :** Rivière Vacarme (1 h), Route des Merveilles (3 h), Vallée des Rois (10 h)
- **Zones d'expédition des familiers :** le Rivage Venteux de La Dune, les Sables Mouvants de La Dune
- **Big events qui s'y déclenchent :**
  - 29 : « Les températures dépassant les 30°C depuis plusieurs jours vous accablent. »
  - 70 : « Alors que vous parcourez le désert de La Dune, l'air vous semble devenir de plus en plus sec. »
- **Rattachés dans le graphe :** L'aventurier au chapeau et au fouet, La pilleuse au piolet

#### Route des Merveilles · `21`

- **Type :** route (`ro`) ; biomes : ruins
- **Description du jeu :** « Une route très empruntée par les villageois. Beaucoup de petits vendeurs ambulants s'y installent le temps d'une journée pour au final créer un immense marché. Plus loin, d'anciennes échoppes désertées depuis longtemps tombent en ruines sous le sable. »
- **Voisins :** La Dune (3 h), Claire de Ville (4 h)
- **Zones d'expédition des familiers :** les Échoppes Abandonnées de la Route des Merveilles
- **Big events qui s'y déclenchent :**
  - 3 : « Alors que vous voyagez sur la Route des Merveilles, vous découvrez un coffret ! »
  - 4 : « Vous avez décidé de profiter d'une nuit calme pour continuer votre progression. »
  - 73 : « Cheminant avec nonchalance sur la Route des Merveilles, vous vous approchez d'un petit groupe de personnes en demi-cercle autour d'un homme de forte corpulence. »
- **Rattachés dans le graphe :** Aldéric l'antiquaire, L'esprit chasseur de bonneteurs, Le dresseur de fauves, Marchands ambulants

#### Bois Hurlant · `22`

- **Type :** forêt (`fo`) ; biomes : forest
- **Description du jeu :** « Forêt mal famée au bord de Claire de Ville, Bois Hurlant a une très mauvaise réputation. Repaire de bandits et hors la loi en tout genre, elle tient surtout son nom de ces pratiques douteuses il y a de ça des centaines d'années. Les brigands se terrent encore dans les grottes qui creusent ses collines. »
- **Voisins :** Lac Mirage (3 h), Claire de Ville (4 h), Route Grimpante (4 h), Rivière Vacarme (4 h)
- **Zones d'expédition des familiers :** les Fourrés des Brigands du Bois Hurlant
- **Big events qui s'y déclenchent :**
  - 11 : « Alors que vous vous apprêtez à rentrer dans une forêt, une inconnue vous explique qu'il existe un chemin plus court en passant par l'ouest. »
  - 23 : « Vous vous baladez en forêt, quand soudain, vous apercevez un chariot qui semble cassé. »
- **Rattachés dans le graphe :** Brigands et hors-la-loi

#### Claire de Ville · `23`

- **Type :** ville (`ci`) ; biomes : cave
- **Description du jeu :** « Grande ville marchande et carrefour économique, Claire de Ville n'a pas toujours été aussi accueillante. Au début très pauvre, elle a su se développer rapidement grâce à ses nombreux commerces et hôtels offrant un large choix aux voyageurs de la région. Claire de Ville est aussi réputée pour son calme et son respect de l'ordre. Sous ses rues, les souterrains creusés au temps de sa misère serpentent encore dans la roche. »
- **Voisins :** Route Grimpante (1 h), Bois Hurlant (4 h), Route des Merveilles (4 h)
- **Zones d'expédition des familiers :** les Souterrains Oubliés de Claire de Ville
- **Auberge :** La Halte des Braves : « Qui n'a jamais entendu parler de la Halte des Braves ? C'est la plus vieille et la plus célèbre auberge de la région. Vous entrez dans une salle bondée, remplie de rires et de chants. Les murs sont couverts de trophées de chasse et d'armes anciennes. C'est l'endroit idéal pour rencontrer d'autres aventuriers. »
  - au menu : Soupe de pommes de terre, Œufs au plat, Curry et riz, Sushi, Poêlon de nourriture des Braves ; chambres : Chambre Simple, Chambre Confortable, Chambre de Luxe
- **En ville :** services : Aller chez le forgeron ; boutiques : Boutique générale, La Bourse, Le Vétérinaire
- **Big events qui s'y déclenchent :**
  - 13 : « Après avoir passé plusieurs semaines à marcher sans effectuer la moindre rencontre humaine, vous arpentez à présent les ruelles d'une petite bourgade plutôt animée. »
  - 15 : « Alors que vous traversez une ville en passant par des ruelles, vous entrez dans ce qui vous semble être une petite boutique où un groupe d'hommes discute tranquillement. »
  - 20 : « À votre arrivée dans un village, vous remarquez du coin de l'œil un garde volant une pauvre femme. »
  - 41 : « Alors que vous continuez votre chemin, vous arrivez à une ville. »
  - 68 : « En arrivant à Claire de Ville, votre regard est attiré par un bâtiment dont l'entrée est encadrée par deux statues de hiboux en pierre. »
  - 72 : « Alors que vous arrivez aux abords de Claire de Ville, vous découvrez que bon nombre de ses habitants se sont déplacés à l'extérieur des grandes murailles : un tournoi… »
- **Rattachés dans le graphe :** Comte de la région voisine, La bibliothécaire de Claire de Ville, La Halte des Braves, Le Forgeron, Le Vétérinaire, Le vétérinaire de la cour, Les Courtiers de la Bourse, Les frères Grimm, Lucya, Yseldia, Yvain

#### Route Grimpante · `24`

- **Type :** route (`ro`) ; biomes : mountain
- **Description du jeu :** « Une route très raide qui mène jusqu'à Claire de Ville. Tout dépend dans quel sens vous l'empruntez. »
- **Voisins :** Claire de Ville (1 h), Rivière aux Crabes (4 h), Bois Hurlant (4 h)
- **Zones d'expédition des familiers :** les Escarpements de la Route Grimpante
- **Big events qui s'y déclenchent :**
  - 37 : « Vous marchez tranquillement sur la route grimpante, le temps est clair et le chemin de pierre en bon état. »
  - 78 : « Vous progressez sur la route grimpante quand soudain un épais brouillard monte de la Rivière aux Crabes, dont vous apercevez encore vaguement le pont au loin. »
  - 79 : « Sur la route grimpante, vous entendez un tintement de clochettes qui se rapproche. »
  - 87 : « Le sentier serpente entre les rochers, rude et escarpé. »
- **Rattachés dans le graphe :** Le berger aux chèvres

#### Rivière aux Crabes · `25`

- **Type :** rivière (`ri`) ; biomes : coast, swamp
- **Description du jeu :** « Tout est dans le nom. Une rivière très appréciée des poissonniers de Claire de Ville. En aval, ses rives se perdent en vasières boueuses où pullulent les crabes. »
- **Voisins :** Route Marécageuse (3 h), Lac Mirage (5 h), Route Grimpante (5 h)
- **Zones d'expédition des familiers :** les Méandres de la Rivière aux Crabes, les Vasières de la Rivière aux Crabes
- **Big events qui s'y déclenchent :**
  - 16 : « Après avoir suivi pendant de longues heures une rivière, vous découvrez un vieux château qui semble abandonné au bord de l'eau. »
  - 57 : « Vous marchez sous un ciel bleu azur. »
  - 84 : « Alors que vous déambulez sur les quais bruyants, vous remarquez un homme trapu à la barbe rousse, juché sur une caisse retournée, qui harangue les passants : il promet… »

#### Mergagnan · `26`

- **Type :** ville (`ci`) ; biomes : plains, coast
- **Description du jeu :** « Une paisible ville au bord de la Plage Sentinelle. »
- **Voisins :** Plage Sentinelle (1 h), Voie champêtre (2 h), Boug-Coton (5 h)
- **Zones d'expédition des familiers :** le Port de Mergagnan, les Jardins de Mergagnan
- **Auberge :** Au Coin du Feu : « Vous entrez dans l'auberge Au Coin du Feu, un endroit où les aventuriers se rassemblent pour partager des histoires autour d'un feu crépitant. L'odeur de poisson grillé flotte dans l'air, à côté des rires et des chants des clients. La décoration est simple mais rappelle la vie des marins et des pêcheurs. »
  - au menu : Crevettes frites, Chaudrée de palourdes, Poisson grillé, Rouleau de homard, Carpaccio de méduse ; chambres : Chambre Simple, Chambre Confortable, Chambre de Luxe
- **En ville :** services : Aller chez le forgeron ; boutiques : Boutique générale, Le Tanneur, Le Vétérinaire
- **Big events qui s'y déclenchent :**
  - 18 : « La ville où vous mettez les pieds semble déserte, sans âme qui vive. »
  - 24 : « Vous montez sur une colline. »
  - 35 : « Vous entrez dans un bar, et le barman vous interpelle, vous disant qu'il aimerait "tester de nouvelles boissons" sur vous. »
  - 39 : « Durant votre périple, vous arrivez dans une ville en bord de mer. »
- **Rattachés dans le graphe :** Au Coin du Feu, Chantier d'Almerac, Le Forgeron, Le Tanneur, Le Vétérinaire, Le vétérinaire de la cour

#### Forêt Célestrum · `27`

- **Type :** forêt (`fo`) ; biomes : forest, mountain
- **Description du jeu :** « Une forêt au bord du Mont Célestrum. Ses lisières grimpent sur les pentes escarpées de la montagne. »
- **Voisins :** Village Coco (5 h), Mont Célestrum (6 h)
- **Zones d'expédition des familiers :** les Clairières Mystiques de la Forêt Célestrum, les Pentes Escarpées de la Forêt Célestrum
- **Big events qui s'y déclenchent :**
  - 6 : « Vous vous étiez arrêté dans une grotte pour manger et vous hésitez à repartir... »
  - 40 : « Vous vous enfoncez dans une forêt sombre, et apercevez la silhouette d'un homme au loin. »
  - 76 : « Après de longues heures de marche à travers la Forêt Celestrum, vous apercevez enfin près d'une rivière scintillante ce qui semble être une maison en ruine. »
  - 77 : « En progressant dans un sentier sinueux de la Forêt Celestrum, vous entendez soudain des éclats de voix provenant d'une clairière proche. »
- **Rattachés dans le graphe :** Minou, Parziter

#### Cour du Château · `41`

- **Type :** ville (`ci`) ; biomes : plains, cave
- **Description du jeu :** « Esplanade pavée reliant Boug-Coton aux portes du château royal. Les messagers s’y croisent avant d’accéder aux appartements du roi. Sous ses pavés courent des passages secrets creusés dans la roche jusqu'aux fondations du château. »
- **Voisins :** Boug-Coton (2 h), Vallée des Rois (9 h)
- **Zones d'expédition des familiers :** les Passages Secrets de la Cour du Château, l'Esplanade de la Cour du Château
- **Auberge :** Le Pavillon Royal : « Vous franchissez les portes du Pavillon Royal, un salon privé du château réservé aux invités de marque. Les plats sont servis sur de l'argenterie gravée et les domestiques veillent à ce que votre moindre désir soit comblé. Même le silence y est feutré, comme si les murs eux-mêmes respectaient l'étiquette. »
  - au menu : Rouleau de homard, Plateau d'huîtres, Carpaccio de méduse, Tourte du Seigneur ; chambres : Suite Royale, Appartement Impérial
- **En ville :** services : Rencontrer le forgeron royal, Consulter l'archiviste des îles ; boutiques : Marché royal, Boutique générale
- **Big events qui s'y déclenchent :**
  - 82 : « Alors que vous vous approchez de l'imposante muraille entourant la cité royale, vous remarquez qu'une fissure descend le long des murs et mène à une ouverture dans… »
  - 83 : « Alors que vous traversez l'aile ouest du château, des éclats de voix vous font tourner la tête. »
  - 89 : « Vous avancez tranquillement dans les rues de la ville entourant le château royal. »
- **Rattachés dans le graphe :** L'Archiviste des îles, Le Forgeron royal, Le Maître des quêtes, Le Pavillon Royal

### A.3 Le château du roi

#### Portes du château · `28`

- **Type :** `castleEntrance` ; biomes : plains
- **Description du jeu :** « Entrée du château du roi. Entouré d'une épaisse muraille, il semble pouvoir résister à toutes les attaques imaginables. »
- **Voisins :** Salle de réception (3 min)
- **Zones d'expédition des familiers :** les Abords des Portes du Château
- **Big events qui s'y déclenchent :**
  - 61 : « **Bonjour et bienvenue sur Crownicles !** Le roi est à la recherche d'un noble chevalier pour marier sa fille et vous avez choisi de participer au concours de sélection ! »

#### Salle de réception · `29`

- **Type :** `castleThrone` ; biomes : plains
- **Description du jeu :** « Immense salle ornée de nombreuses oeuvres d'art. »
- **Voisins :** Boug-Coton (1 h), Ville Forte (1 h), Village Coco (1 h), Claire de Ville (1 h), Mergagnan (1 h)
- **Zones d'expédition des familiers :** les Alcôves de la Salle de Réception
- **Big events qui s'y déclenchent :**
  - 60 : « Vous êtes amené dans la grande salle de réception du château où vous rencontrez rapidement le roi. »

#### Route vers le château du Roi · `32`

- **Type :** route (`ro`) ; biomes : plains
- **Description du jeu :** « La route qui mène au château du Roi. »
- **Voisins :** Portes du château (0 min), Salle de réception (1 h)
- **Zones d'expédition des familiers :** les Pavés Royaux de la Route vers le Château

### A.4 Les lieux hantés (événement d'Halloween)

#### Sentier brumeux · `39`

- **Type :** `mistyPath` ; biomes : forest
- **Description du jeu :** « Sentier noyé dans une brume épaisse, immobile et sans origine. Ni repère ni forme ne permet de situer cet endroit. »
- **Voisins :** Maison hantée (2 h)

#### Maison hantée · `40`

- **Type :** `hauntedHouse` ; biomes : ruins
- **Description du jeu :** « Une vieille demeure délabrée se dressant dans une brume épaisse, comme suspendue entre deux mondes. Impossible de dire d’où elle vient, ni même si elle appartient encore au nôtre. Ses fenêtres fissurées laissent danser des ombres indistinctes, tandis qu’un grincement sourd s’échappe de l’intérieur, écho d’une présence oubliée. »
- **Voisins :** Lac Mirage (1 h), Route des Merveilles (1 h)
- **Zones d'expédition des familiers :** les Couloirs Hantés de la Maison Hantée
- **Big events qui s'y déclenchent :**
  - 81 : « Vous franchissez le seuil d'une vieille demeure à l'allure délabrée. »

### A.5 Le départ vers les îles

#### Continent principal · `33`

- **Type :** `continent` ; biomes : plains
- **Voisins :** Plage noire (30 min), Rivage gla-gla (30 min), Plage de coquillage (30 min)
- **Rattachés dans le graphe :** Le capitaine du navire de l'île

### A.6 Les îles

Big events possibles sur tous ces lieux (déclencheur `mapAttributes: pve_island_entry`) : 66.

**L'île volcanique**

#### Plage noire · `1000`

- **Type :** plage (`be`) ; biomes : coast
- **Description du jeu :** « Une grande plage de sable volcanique noir. Elle tient son nom de sa couleur très particulière. Les premiers hommes à avoir posé le pied sur la plage noire redoutaient une grande malédiction. Il n'en est évidemment rien. Attention cependant, le sable noir tache les pieds et les habits. »
- **Voisins :** Forêt de la pénombre (4 min)

#### Forêt de la pénombre · `1001`

- **Type :** forêt (`fo`) ; biomes : forest
- **Description du jeu :** « Une immense forêt qui recouvre pratiquement l'entièreté de l'île. De fines particules de cendres tombent du Volcan Grondant, ce qui rend la visibilité dans cette forêt plutôt difficile. Elle est de ce fait que très peu explorée. »
- **Voisins :** Village en ruines (4 min), Mine brumeuse (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Troll de la forêt, Mutant Vaseux
- **Rattachés dans le graphe :** Mutant Vaseux

#### Village en ruines · `1002`

- **Type :** ruines (`ruins`) ; biomes : ruins
- **Description du jeu :** « Un petit village d'une vingtaine de maisons, partiellement détruit, qui se trouve à proximité de la forêt de la pénombre. Personne ne sait exactement pourquoi ce village est en ruines. Beaucoup pensent qu'il s'agit du village des anciens habitants qui auraient succombé aux coulées de lave du Volcan Grondant. Mais d'autres avancent la théorie d'une maladie, la peste et de nombreux rats. Il ne reste plus un seul habitant ici... »
- **Voisins :** Chemin escarpé (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Squelette

#### Mine brumeuse · `1003`

- **Type :** mine (`mine`) ; biomes : cave
- **Description du jeu :** « Cette ancienne mine abandonnée passe sous le chemin escarpé et les montagnes. Elle est tellement grande et labyrinthique qu'elle finit au cœur du volcan. Il est cependant difficile d'arriver jusque là. Attention toutefois à ne pas glisser, certains auraient retrouvé de vieux restes de bananes dans la mine brumeuse. »
- **Voisins :** Chemin escarpé (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Araignée

#### Chemin escarpé · `1004`

- **Type :** montagne (`mo`) ; biomes : mountain
- **Description du jeu :** « Ce chemin est le seul vrai chemin existant permettant d'aller jusqu'au sommet du Volcan Grondant. Il est très difficile de l'utiliser et surtout très dangereux. De nombreux hommes sont morts en voulant y grimper. À vos risques et périls. »
- **Voisins :** Volcan grondant (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Golem de pierre

#### Volcan grondant · `1005`

- **Type :** volcan (`volcano`) ; biomes : cave
- **Description du jeu :** « Pièce maîtresse de l'île volcanique, ce volcan est toujours en activité. Il déverse plusieurs tonnes de cendres par an sur cette petite île qui de ce fait ne fait que grandir. La lave qui coule en son centre est en si grande quantité qu'un canal souterrain qu'on appelle Canal Lavique circule sur plusieurs kilomètres. Depuis les bateaux sur l'eau, on peut apercevoir ce canal faire bouillir l'eau en profondeur. Ce volcan serait même le créateur de plusieurs petites îles aux alentours comme l'île de glace. »
- **Voisins :** Bateau pour quitter l'île (5 min)
- **Monstres :** Titan de magma
- **Rattachés dans le graphe :** Le Titan de magma

**L'île glacée**

#### Rivage gla-gla · `1100`

- **Type :** plage glacée (`iceBeach`) ; biomes : coast
- **Description du jeu :** « Ce rivage est la première chose que l'on voit quand on arrive sur l'île de glace. Il tire son nom du bruit que faisaient les marins quand ils ont accosté. Évidemment, ils revenaient de l'île volcanique où la température est beaucoup plus chaude. »
- **Voisins :** Toundra (4 min)

#### Toundra · `1101`

- **Type :** toundra (`tundra`) ; biomes : plains
- **Description du jeu :** « Une étendue de terre gelée où le climat est sans pitié. Une tempête permanente de neige rend difficile la progression et la cartographie du lieu. On peut y croiser tous types d’animaux arctiques. »
- **Voisins :** Caverne de cristal (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Loup blanc

#### Caverne de cristal · `1102`

- **Type :** caverne de cristal (`crystalCavern`) ; biomes : ruins
- **Description du jeu :** « Une grande caverne dans laquelle le moindre rayon de soleil qui rentre est démultiplié par les cristaux rendant celle-ci très lumineuse. Des stalactites pointus et des stalagmites tranchantes, synonymes de blessures graves voir mortelles si l’une d’elle nous tombe dessus ou que l’on fait un pas de travers, forment le décor de la caverne. Si vous osez vous aventurez plus loin, vous devrez choisir entre sortir vers le sommet du pic enneigée ou vous enfoncer encore plus profond. »
- **Voisins :** Portes sacrées (4 min), Lac souterrain (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Élémentaire brillant

#### Portes sacrées · `1103`

- **Type :** `blessedDoors` ; biomes : ruins
- **Description du jeu :** « Deux majestueuses portes se dressent en haut d’une longue série de marches. Les monter ne sera pas de tout repos. On raconte qu’elles ont été construites par une civilisation ancienne en l’honneur d’une divinité. »
- **Voisins :** Pic enneigé (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Gardien céleste
- **Rattachés dans le graphe :** Divinité des Portes sacrées, Gardien céleste

#### Pic enneigé · `1104`

- **Type :** pic (`icePeak`) ; biomes : mountain
- **Description du jeu :** « Dans la chaîne de montagnes, ce pic se démarque par la violence de ses tempêtes de neige et la vitesse de ses vents. Il est si haut que l’oxygène y est rare et que le risque de mourir de froid est élevé si vous n’avez pas déjà succombé aux animaux sauvages… »
- **Voisins :** Bateau pour quitter l'île (5 min)
- **Monstres :** Seigneur des glaces
- **Rattachés dans le graphe :** Le Seigneur des glaces

#### Lac souterrain · `1105`

- **Type :** lac (`undergroundLake`) ; biomes : swamp, cave
- **Description du jeu :** « Un grand lac au cœur de la montagne dont la traversée n’est pas sans risque. Comme la température est glaciale, le fait qu’il ne soit pas gelé reste un mystère. Nul n’en connait sa profondeur ni sa faune. »
- **Voisins :** Village dévasté (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Crocodile

#### Village dévasté · `1106`

- **Type :** ruines (`ruins`) ; biomes : ruins
- **Description du jeu :** « Un village riche abandonné dont il ne reste que ruines et désolations. On peut y voir le toit d’un manoir qui a plié sous le poids de la cloche de l’église effondrée. Il y règne un silence pesant parfois interrompu par les cris de souffrance des âmes égarés. »
- **Voisins :** Nid glacé (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Yuki-Onna
- **Rattachés dans le graphe :** Yuki-Onna

#### Nid glacé · `1107`

- **Type :** `dragonsNest` ; biomes : ruins
- **Description du jeu :** « Personne ne s'est encore aventuré jusque là. Au loin, vous voyez une gigantesque silhouette se réfléchir sur un mur de glace. »
- **Voisins :** Bateau pour quitter l'île (5 min)
- **Monstres :** Reine des glaces
- **Rattachés dans le graphe :** La Reine des glaces

**L'île maritime**

#### Plage de coquillage · `1200`

- **Type :** plage (`be`) ; biomes : coast
- **Description du jeu :** « Une plage paradisiaque recouverte de coquillages de toutes les couleurs. On dit que chaque coquillage garde en lui l'écho de l'océan. Le sable fin et blanc contraste avec les eaux turquoise du lagon voisin. Attention où vous mettez les pieds, certains coquillages sont tranchants comme des lames. »
- **Voisins :** Creux du Lagon (4 min)

#### Creux du Lagon · `1201`

- **Type :** plage (`be`) ; biomes : coast
- **Description du jeu :** « Un lagon aux eaux d'un bleu cristallin protégé par une barrière de corail. Derrière la limpidité de l'onde, des courants sournois, nés des battements de l'océan, guettent la moindre imprudence pour entraîner les égarés vers l'abysse. Dans ce fragile écrin marin, les tortues millénaires viennent chercher un repos que l'agitation du large leur refuse. »
- **Voisins :** Caverne Maritime (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Tortue Géante
- **Rattachés dans le graphe :** Tortue Géante

#### Caverne Maritime · `1202`

- **Type :** `cavern` ; biomes : ruins
- **Description du jeu :** « Une grotte marine qui ne se laisse conquérir qu'à marée basse, révélant une gueule de calcaire aux parois ruisselantes. À l'intérieur, des lueurs éthérées naissent de la roche, jetant des reflets d'azur sur les voûtes. Entre les ondes et les ombres, des silhouettes de brume et d'écume dansent un ballet muet, comme si l'âme de la mer elle-même s'était réfugiée dans ce sanctuaire. »
- **Voisins :** Crique du Revenant (4 min), Cave des murmures (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Esprit des mers
- **Rattachés dans le graphe :** Esprit des mers

#### Crique du Revenant · `1203`

- **Type :** `creek` ; biomes : coast
- **Description du jeu :** « Une crique isolée qui déploie ses récifs comme des lames de granit noir, à peine dissimulées sous un ressac écumeux qui ne s'apaise jamais. La nuit, des feux follets d'un bleu spectral flottent au-dessus des vagues comme les âmes de marins perdus, esquissant une danse macabre. Une aura sinistre plane sur ce lieu maudit. »
- **Voisins :** Ravin des Abysses (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Capitaine Crow
- **Rattachés dans le graphe :** Capitaine Crow

#### Cave des murmures · `1204`

- **Type :** `cavern` ; biomes : ruins
- **Description du jeu :** « Une cathédrale sous-marine sculptée pour amplifier le souffle des marées en un coeur envoûtant. Ce n'est pas le vent, c'est l'appel d'un chant mélodieux qui s'adresse directement à votre âme. Dans cette pénombre sonore, la frontière entre vos propres pensées et les murmures de la roche s'efface doucement, et ceux qui s'y attardent n'en ressortent jamais tout à fait seuls. »
- **Voisins :** Gouffre des Profondeurs (4 min), Bateau pour quitter l'île (5 min)
- **Monstres :** Sirène
- **Rattachés dans le graphe :** La Sirène

#### Gouffre des Profondeurs · `1205`

- **Type :** `abyss` ; biomes : swamp
- **Description du jeu :** « À mesure que l'on s'approche du bord, l'eau vire au noir d'encre, un miroir sombre qui ne reflète que votre propre peur. Parfois, une ondulation démesurée brise la surface, passage fugace d'un tentacule géant qui remonte des tréfonds avant de replonger dans l'oubli. Nul n'a jamais sondé le coeur de cette fosse, car le Gouffre n'accepte aucun témoin. »
- **Voisins :** Bateau pour quitter l'île (5 min)
- **Monstres :** Kraken
- **Rattachés dans le graphe :** Le Kraken

#### Ravin des Abysses · `1206`

- **Type :** `abyss` ; biomes : swamp
- **Description du jeu :** « Le point le plus profond de ces eaux, un ravin sous-marin qui plonge dans les ténèbres absolues. La pression y est telle que peu de créatures peuvent y survivre. On murmure qu'une bête primordiale y sommeille depuis l'aube des temps, gardienne des secrets les plus anciens de ce monde. Seuls les plus téméraires osent s'en approcher. »
- **Voisins :** Bateau pour quitter l'île (5 min)
- **Monstres :** Léviathan
- **Rattachés dans le graphe :** Le Léviathan

**Le retour**

#### Bateau pour quitter l'île · `1999`

- **Type :** `pveExit` ; biomes : coast
- **Description du jeu :** « Un vieux bateau en bois, il a l'air de tenir le coup grâce aux réparations des ouvriers. Il est prêt à partir et n'attend plus que votre arrivée. »
- **Voisins :** La Dune (8 min), Lac Mirage (8 min), Rivière aux Crabes (8 min), Plage Sentinelle (8 min)
- **Big events qui s'y déclenchent :**
  - 67 : « Après un peu de marche, vous arrivez au niveau du bateau qui vous a emmené préalablement sur cette île peu hospitalière. »
- **Rattachés dans le graphe :** Le capitaine du bateau

<!-- canon:end -->
