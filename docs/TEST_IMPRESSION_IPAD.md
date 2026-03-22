# Test impression iPad (Vercel + Epson/AirPrint)

Date: 2026-03-22

## 0. Objectif
1. Vérifier que chaque ticket part sur la bonne imprimante: `Cuisine`, `Bar`, `Caisse`.
2. Comparer `Direct Epson` et `AirPrint` en conditions réelles.
3. Définir le mode le plus sûr pour un service très chargé.

## 1. Préparer le réseau
1. Connecter l'iPad de prise de commande au Wi-Fi du restaurant.
2. Vérifier que les 3 imprimantes sont sur ce même réseau.
3. Désactiver le mode Wi-Fi invité.
4. Désactiver l'isolation client/AP isolation sur routeur et répéteur.
5. Si répéteur utilisé, vérifier qu'il laisse passer Bonjour/mDNS (important pour AirPrint).

## 2. Vérifier les IP imprimantes
1. Récupérer l'IP `Cuisine` (ex: `192.168.1.30`).
2. Récupérer l'IP `Bar` (ex: `192.168.1.31`).
3. Récupérer l'IP `Caisse` (ex: `192.168.1.32`).
4. Configurer des baux DHCP réservés (IP fixes).
5. Noter le nom AirPrint affiché sur iPad pour chaque imprimante.

## 3. Configurer dans l'app
1. Ouvrir l'app sur iPad.
2. Aller dans `Administration` > carte `Impression`.
3. Renseigner `IP Cuisine`, `IP Bar`, `IP Caisse`.
4. Choisir le `Mode d'impression` à tester:
5. `Direct Epson (LAN local)` pour impression directe via IP.
6. `AirPrint (dialogue iPad)` pour impression via popup iOS.
7. Cliquer `Enregistrer`.

## 4. Test rapide admin (smoke test)
1. Cliquer `Test Cuisine`.
2. Cliquer `Test Bar`.
3. Cliquer `Test Caisse`.
4. Valider le résultat:
5. Ticket sorti sur la bonne imprimante.
6. Pas de délai anormal.
7. Pas d'erreur affichée dans l'app.

## 5. Test réel commande multi-zones
1. Créer une commande avec au moins:
2. 2 articles cuisine.
3. 1 article bar.
4. 1 note (ex: sans oignon) pour vérifier le contenu.
5. Envoyer la commande.
6. Aller sur `Cuisine` et imprimer le ticket.
7. Aller sur `Bar` et imprimer le ticket.
8. Aller sur `Addition` et imprimer le ticket caisse.
9. Contrôler:
10. Les articles cuisine ne sortent pas au bar.
11. Les articles bar ne sortent pas en cuisine.
12. Le ticket caisse sort bien sur la caisse.

## 6. Spécifique AirPrint (important)
1. Un clic impression = une popup iOS à valider manuellement.
2. En web iPad, ne pas compter sur "2 popups automatiques en un clic".
3. Pour bar + cuisine, faire deux impressions successives.
4. Vérifier que Safari autorise les popups.
5. Vérifier que la bonne imprimante est sélectionnée dans la popup.
6. Le premier print après ouverture de session peut être un peu plus lent.

## 7. Spécifique Direct Epson
1. Nécessite que l'iPad atteigne `http://IP_IMPRIMANTE`.
2. Si l'app est servie en HTTPS (Vercel), certains navigateurs peuvent bloquer l'accès HTTP local.
3. Si message de blocage réseau, basculer en `AirPrint` immédiatement.

## 8. Matrice de tests à exécuter
1. `Mode AirPrint` + ticket cuisine seul.
2. `Mode AirPrint` + ticket bar seul.
3. `Mode AirPrint` + ticket caisse seul.
4. `Mode AirPrint` + commande mixte bar/cuisine.
5. `Mode Direct Epson` + ticket cuisine seul.
6. `Mode Direct Epson` + ticket bar seul.
7. `Mode Direct Epson` + ticket caisse seul.
8. `Mode Direct Epson` + commande mixte bar/cuisine.
9. Comparer le mode le plus stable et le plus rapide.

## 9. Test charge service (objectif "200 tables assises")
1. Préparer au moins 2 iPad si possible.
2. Enchaîner un grand volume de commandes pendant 20 à 30 minutes.
3. Inclure des commandes mixtes bar + cuisine + addition.
4. Vérifier qu'aucun ticket n'est perdu.
5. Mesurer un délai moyen clic impression -> ticket sorti.
6. Vérifier qu'il n'y a pas de confusion d'imprimante sous stress.
7. Tester perte/reconnexion Wi-Fi en plein flux.
8. Tester redémarrage d'une imprimante pendant le service.
9. Tester le comportement du répéteur (avec et sans).

## 10. Procédure de secours (runbook rapide)
1. Si impression échoue une fois: relancer immédiatement.
2. Si échec répété en `Direct Epson`: passer en `AirPrint`.
3. Si AirPrint ne voit plus l'imprimante: vérifier Wi-Fi + popup + redémarrer imprimante.
4. Garder un iPad manager pour les tests `Test Cuisine/Bar/Caisse` en service.
5. Documenter les incidents constatés (heure, mode, imprimante, erreur).

## 11. Décision production
1. Choisir le mode qui a le moins d'échecs sur les tests ci-dessus.
2. Garder l'autre mode comme fallback opérationnel.
3. Refaire un mini smoke test chaque début de service.
