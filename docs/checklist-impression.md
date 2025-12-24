# Checklist de tests d’impression POS (réseau)

Dernière mise à jour: 2025-12-24

## 1) Préparation
- [ ] Identifier le modèle d’imprimante et le protocole supporté (RAW 9100 / ESC/POS, IPP/AirPrint, Bluetooth).
- [ ] Brancher l’imprimante (si possible en Ethernet, sinon Wi‑Fi) et vérifier le papier.
- [ ] Imprimer la page d’auto‑test pour récupérer l’adresse IP et le mode réseau.
- [ ] Fixer une IP (réservation DHCP ou IP statique) pour éviter les changements d’adresse.

## 2) Réseau
- [ ] Mettre téléphone/tablette et imprimante sur le même SSID/VLAN (pas de réseau invité).
- [ ] Désactiver l’isolation client/AP sur le SSID utilisé.
- [ ] Vérifier que le routeur/pare‑feu autorise:
  - [ ] TCP 9100 (RAW) si ESC/POS direct.
  - [ ] UDP 5353 mDNS/Bonjour si découverte utilisée.
  - [ ] TCP 631 si IPP/AirPrint utilisé.
- [ ] Optionnel: désactiver la veille profonde/eco sur l’imprimante.

## 3) Vérifications bas niveau
- [ ] Depuis un ordinateur du même réseau, ping l’IP de l’imprimante (répond au ping?).
- [ ] Tester l’ouverture du port 9100 (telnet/nc) si mode RAW.
- [ ] Envoyer quelques bytes ESC/POS pour vérifier une impression minimale (voir Annexes).

## 4) Configuration de l’app
- [ ] Saisir l’adresse IP fixe de l’imprimante dans l’app.
- [ ] Configurer le protocole correct (ESC/POS RAW vs IPP/AirPrint).
- [ ] Régler la largeur de papier (58/80mm) et la densité si paramétrable.
- [ ] Choisir l’encodage/code page correct pour la langue (accents, €, etc.).
- [ ] Activer la découpe automatique si supportée.

## 5) Tests rapides (fumée)
- [ ] Impression d’un ticket très court (texte simple « Bonjour ») → sort correctement.
- [ ] Alignements: gauche/centre/droite rendent correctement.
- [ ] Caractères spéciaux (é, è, ç, €, @) s’impriment correctement.

## 6) Tests fonctionnels complets
- [ ] Impression d’un ticket standard de commande (entête, lignes, totaux, TVA).
- [ ] Long ticket (> 1 page) pour vérifier l’avance papier et la découpe.
- [ ] Images/logo: test du logo en haut de page (si support ESC/POS image).
- [ ] Codes barres / QR (si utilisés dans l’app) s’impriment et sont lisibles.
- [ ] Découpeur: coupe partielle/complète selon paramètre attendu.
- [ ] Vitesse d’impression acceptable, pas de pause/lag excessif.

## 7) Résilience et erreurs
- [ ] Débrancher/rebrancher le réseau de l’imprimante → l’app gère le timeout et la reconnexion.
- [ ] IP non joignable: l’app affiche une erreur claire et récupérable.
- [ ] Capot ouvert / plus de papier: l’app signale l’échec d’impression.
- [ ] Reprise après erreur: réimpression possible sans crash.

## 8) Scénarios réseau courants à valider
- [ ] Appareil sur Wi‑Fi 5 GHz et imprimante sur 2.4 GHz → OK si pas d’isolation inter‑bandes.
- [ ] SSID invité: vérifier que la communication locale est bloquée (attendu) et documenter.
- [ ] Changement de box/routeur: l’impression échoue tant que l’IP n’est pas mise à jour; procédure documentée.

## 9) Performance
- [ ] Ticket de 50–100 lignes imprime sans saccade/exceptions.
- [ ] Plusieurs tickets en rafale (3–5) passent sans perte ni mélange.

## 10) Validation finale
- [ ] Tous les tests essentiels passent sur le réseau cible (site de prod).
- [ ] L’IP est fixée et notée.
- [ ] Procédure de secours: réimpression, changement d’IP, test rapide documentés.

---

## Annexes

### A. Ports et protocoles courants
- RAW/ESC/POS: TCP 9100.
- mDNS/Bonjour: UDP 5353 (découverte).
- IPP/AirPrint: TCP 631.

### B. Test rapide ESC/POS (ordinateur)
- macOS/Linux: `nc <IP_IMPRIMANTE> 9100` puis envoyer `\x1B@` (init) et du texte suivi de `\n\n\n`.

### C. Code pages (accents)
- Essayer CP858/CP850/Windows-1252 selon l’imprimante. Régler côté app et/ou imprimante.
