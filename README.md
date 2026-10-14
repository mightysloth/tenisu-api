# Tenisu API

API NestJS 12 / TypeScript pour le test technique backend de L’Atelier. Les quatre endpoints demandés sont implémentés, avec validation, gestion des erreurs, persistance et tests. L’application est déployée sur AWS à Paris.

- [API : joueurs](https://3t3l6booh8.execute-api.eu-west-3.amazonaws.com/api/v1/players)
- [Documentation Swagger](https://3t3l6booh8.execute-api.eu-west-3.amazonaws.com/docs)
- [Spécification OpenAPI](https://3t3l6booh8.execute-api.eu-west-3.amazonaws.com/openapi.json)

## Lancer en local

Prérequis : Node.js 24 LTS et npm. Aucun compte AWS ni Docker n’est nécessaire pour le développement ou les tests.

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run db:local
```

Dans un second terminal :

```sh
npm run start:dev
```

- API : <http://localhost:3000/api/v1/players>
- Swagger : <http://localhost:3000/docs>
- OpenAPI : <http://localhost:3000/openapi.json>

`db:local` lance Dynalite, un émulateur DynamoDB réservé au développement. Il crée la table, importe les cinq joueurs fournis et conserve les données dans `data/dynamodb`. Relancer la commande préserve les joueurs existants. Le client local utilise des identifiants fictifs et contacte uniquement une adresse locale.

Pour lancer une compilation sans surveillance :

```sh
npm run build
npm start
```

## Endpoints

| Méthode | Route                 | Comportement                                                  |
| ------- | --------------------- | ------------------------------------------------------------- |
| GET     | `/api/v1/players`     | Tous les joueurs, triés par classement croissant              |
| GET     | `/api/v1/players/:id` | Joueur complet ; `404` si absent                              |
| GET     | `/api/v1/statistics`  | Meilleur pays, IMC moyen, taille médiane                      |
| POST    | `/api/v1/players`     | Ajout persistant ; `201` avec en-tête `Location`              |
| GET     | `/api/v1/health`      | Disponibilité de l’API et du stockage ; `503` si indisponible |

Le GET de liste conserve l’enveloppe `{ "players": [...] }` du fichier fourni. À classement égal, les points décroissants puis l’ID croissant départagent les joueurs.

Le POST attend la structure complète d’un joueur, avec un ID entier positif fourni par le client, comme dans le jeu de données. Cette convention garde des identifiants numériques homogènes et évite un compteur distribué inutile pour ce test. L’écriture conditionnelle DynamoDB empêche tout remplacement d’un ID existant, y compris lors de requêtes simultanées : un doublon renvoie `409`.

La lecture est publique. L’ajout exige `X-API-Key`, correspondant à `WRITE_API_KEY`. En local uniquement, la clé de `.env.example` permet de tester depuis Swagger ou curl.

Exemple fictif :

```sh
curl -i http://localhost:3000/api/v1/players \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: local-development-key-change-before-deploy' \
  -d '{
    "id": 120,
    "firstname": "Alex",
    "lastname": "Martin",
    "shortname": "A.MAR",
    "sex": "M",
    "country": { "code": "FRA", "picture": "https://example.com/france.png" },
    "picture": "https://example.com/alex.png",
    "data": {
      "rank": 12,
      "points": 1500,
      "weight": 75000,
      "height": 180,
      "age": 25,
      "last": [1, 0, 1]
    }
  }'
```

Les champs inconnus, les structures imbriquées invalides, les nombres transmis comme chaînes et les résultats autres que `0` ou `1` sont refusés (`400`). Les images doivent avoir une URL HTTPS ; l’API ne les télécharge pas. Le corps JSON est limité à 16 Ko. Les erreurs utilisent le format natif NestJS : `statusCode`, `message`, `error`.

## Calculs et hypothèses

- **Ratio par pays** : somme des victoires / nombre de matchs disponibles dans `data.last`, tous joueurs du pays confondus. Ce n’est pas une moyenne des ratios individuels, ni une statistique de carrière. Un pays sans résultat est exclu. En cas d’égalité, le code pays alphabétiquement premier gagne.
- **IMC moyen** : moyenne des IMC individuels, calculés par `(weight / 1000) / (height / 100)²`, arrondie à deux décimales.
- **Taille médiane** : tailles triées ; valeur centrale pour un effectif impair, moyenne des deux valeurs centrales pour un effectif pair. Unité : centimètres.
- Avec une liste vide, les trois statistiques valent `null`. Les ajouts sont pris en compte immédiatement, sans cache.

Résultat avec les cinq joueurs d’origine :

```json
{
  "bestCountry": { "code": "SRB", "wins": 5, "matches": 5, "ratio": 1 },
  "averageBmi": 23.36,
  "medianHeight": 185,
  "playerCount": 5
}
```

## Architecture

```text
src/
  players/
    domain/           types métier et règle de classement
    http/             contrôleur et DTO validés
    infrastructure/   adaptateur du SDK AWS et données fournies
    players.service.ts
    players.module.ts
  statistics/         calcul pur, contrôleur, DTO et module
  common/             clé d’écriture, erreurs documentées, health
  config.ts           validation de la configuration
  bootstrap.ts        configuration HTTP et Swagger
  main.ts             serveur local
  lambda.ts           adaptateur Lambda
infra/template.yaml   infrastructure AWS déclarative
```

Le repository utilise directement `@aws-sdk/lib-dynamodb` : `GetCommand`, `QueryCommand` et `PutCommand`. Il isole le stockage, gère la pagination interne DynamoDB et traduit les conflits.

DynamoDB est adapté à cette petite API sur Lambda : [mode à la demande](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html), accès par ID et persistance gérée. La liste et les statistiques relisent tous les joueurs. Si le catalogue devenait important, il faudrait revoir ces accès avec pagination publique, agrégats ou une base relationnelle. Le tri et la médiane ont une complexité de `O(n log n)` ; la mémoire utilisée est `O(n)`.

## Vérifier

```sh
npm test
npm run check
```

`check` exécute formatage, lint, vérification TypeScript, tests et compilation. La CI GitHub Actions lance la même commande. Les tests de calcul sont unitaires ; les tests d’intégration HTTP et de persistance utilisent le SDK réel avec une base émulée neuve sur un port aléatoire. Ils couvrent notamment les statistiques, le classement, les données invalides, l’authentification, les doublons concurrents, les ajouts et les pannes de stockage. Ils n’utilisent aucun compte AWS et ne touchent pas les données locales.

## Déployer sur AWS

Prérequis : un compte AWS et AWS CLI v2 configuré. Le script exige un profil explicite et vérifie l’ID du compte avant toute création de ressource.

```sh
read -s WRITE_API_KEY
export WRITE_API_KEY
npm run deploy:aws -- --profile deployment --account-id VOTRE_ID_AWS_12_CHIFFRES
unset WRITE_API_KEY
```

Saisir une nouvelle clé aléatoire d’au moins 32 caractères. Le script refuse la clé de développement. La région par défaut est Paris (`eu-west-3`), modifiable via `--region`. Le profil de déploiement doit pouvoir créer la stack CloudFormation, le bucket d’artefacts, la fonction Lambda, la table DynamoDB, les rôles IAM et les logs.

Le script vérifie le projet, prépare un paquet contenant uniquement les dépendances de production, crée un bucket privé, déploie la stack SAM via CloudFormation, importe les joueurs sans écraser les IDs existants et vérifie les routes publiques. Il affiche les URL de l’API et de Swagger. La clé passe par un fichier temporaire privé, supprimé après la commande, et un paramètre CloudFormation `NoEcho` ; elle n’est pas stockée dans Git.

Infrastructure : API Gateway HTTP avec HTTPS et limitation du débit, Lambda Node.js 24 ARM64, DynamoDB à la demande et chiffré, logs conservés sept jours. Les permissions DynamoDB de la fonction sont limitées à la table du projet. Ces services et le bucket d’artefacts sont facturables.

À la suppression de la stack, la table DynamoDB est conservée pour préserver les ajouts. Pour arrêter toute facturation, supprimer ensuite la table conservée et le bucket d’artefacts, une fois leurs données sauvegardées si nécessaire.

## Données et documentation

Le jeu de données fourni dans l’énoncé est versionné dans `src/players/infrastructure/headtohead.json`. Les poids sont en grammes et les tailles en centimètres.

- [NestJS 12 et ESM](https://docs.nestjs.com/migration-guide)
- [Validation NestJS](https://docs.nestjs.com/techniques/validation)
- [Query DynamoDB et pagination](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html)
- [Dynalite](https://github.com/architect/dynalite)
