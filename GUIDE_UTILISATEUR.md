# Guide d'utilisation - Application POS Restaurant

## Table des matières
1. [Connexion](#connexion)
2. [Plan de salle](#plan-de-salle)
3. [Prise de commande](#prise-de-commande)
4. [Encaissement](#encaissement)
5. [Historique des ventes](#historique-des-ventes)
6. [Réservations](#réservations)
7. [Administration](#administration)

---

## Connexion

### Pour tous les utilisateurs
1. Entrez votre code PIN à 4 chiffres
2. Cliquez sur "Se connecter"
3. Vous serez redirigé vers le plan de salle

**Note:** Si vous oubliez votre PIN, contactez un administrateur.

---

## Plan de salle

### Vue d'ensemble
Le plan de salle affiche toutes les tables du restaurant avec leur statut en temps réel.

### Statuts des tables
- **Vert (Disponible):** Table libre, prête à accueillir des clients
- **Orange (Occupée):** Table avec des clients, commande en cours
- **Rouge (Réservée):** Table réservée pour une heure spécifique
- **Bleu (Terminée):** Commande terminée, en attente d'encaissement

### Actions disponibles
- **Cliquer sur une table:** Ouvrir le menu de prise de commande
- **Bouton "Historique":** Voir les tables encaissées dans la journée
- **Bouton "Réservations":** Gérer les réservations de tables
- **Recherche de table:** Utilisez la barre de recherche pour trouver rapidement une table par son numéro

---

## Prise de commande

### Démarrer une commande
1. Sélectionnez une table depuis le plan de salle
2. Choisissez une catégorie (Entrées, Plats, Desserts, Boissons, etc.)
3. Cliquez sur les articles pour les ajouter au panier

### Gérer les quantités
- **+/-:** Augmenter ou diminuer la quantité d'un article
- Les quantités s'affichent sur les cartes des articles

### Fonctionnalités avancées

#### Plats "À suivre"
Pour les plats qui doivent être servis plus tard:
1. Cliquez sur le bouton "À suivre" sur l'article dans le panier
2. L'article sera marqué en jaune
3. Il sera envoyé en cuisine uniquement quand vous cliquerez sur "Envoyer" dans l'alerte jaune

#### Notes pour la cuisine
1. Cliquez sur "Notes" pour un article dans le panier
2. Ajoutez des instructions spéciales (ex: "Sans oignons", "Bien cuit")
3. Ces notes apparaîtront sur le ticket de cuisine

#### Suppléments personnalisés
Pour ajouter des montants libres (pourboires, frais de service):
1. Cliquez sur "Ajouter un supplément"
2. Entrez le nom et le montant
3. Ajoutez des notes si nécessaire
4. **Important:** Les suppléments sont comptés dans le total mais ne sont PAS imprimés sur le ticket de caisse

### Envoyer la commande
1. Vérifiez le total et les articles
2. Cliquez sur "Envoyer la commande"
3. La commande est envoyée en cuisine/bar selon le routage des articles

---

## Encaissement

### Accéder à l'addition
1. Depuis le plan de salle, cliquez sur une table occupée
2. Cliquez sur le bouton "Addition" en haut à droite

### Modes de paiement

#### 1. Addition complète
- Encaisse le montant total restant
- Utilisé quand un seul client paie pour toute la table

#### 2. Partage égal
- Divise le montant restant par le nombre de personnes
- Entrez le nombre de personnes
- Chaque personne paie une part égale

#### 3. Par articles
- Permet de sélectionner exactement quels articles sont payés
- **Sélection de quantités:** Si un plat apparaît plusieurs fois, vous pouvez choisir combien d'unités payer
- Utilisez les boutons +/- ou entrez directement la quantité
- Parfait pour les paiements séparés

### Réduction personnalisée
1. Cliquez sur "Ajouter" dans la section "Réduction personnalisée"
2. Entrez le montant à déduire
3. La réduction s'applique au montant à régler

### Méthodes de paiement
- **Espèces:** Paiement en liquide
- **Carte bancaire:** Paiement par carte

### Paiements partiels
- Après un paiement partiel, la page se rafraîchit automatiquement
- Les articles payés sont barrés et marqués "Payé"
- Les articles partiellement payés affichent la quantité restante
- Le système affiche automatiquement ce qui reste à payer

### Persistance des données
- Si vous quittez la page d'encaissement, vos sélections sont sauvegardées
- Vous pouvez revenir plus tard et retrouver votre travail
- Les données sont effacées uniquement quand le paiement est complet

### Imprimer l'addition
- Cliquez sur le bouton "Imprimer" en haut à droite
- Une fenêtre d'impression s'ouvre avec l'addition formatée

---

## Historique des ventes

### Accéder à l'historique
- Depuis le plan de salle, cliquez sur "Historique"

### Informations disponibles
- **Liste des tables encaissées:** Toutes les tables payées dans la journée
- **Détails par table:** Numéro, montant, serveur, heure de paiement
- **Statistiques par serveur:**
  - Chiffre d'affaires total
  - Nombre de tables encaissées
  - Détail de chaque encaissement

### Filtres
- Filtrez par date pour voir l'historique d'autres jours
- Recherchez par numéro de table ou nom de serveur

---

## Réservations

### Créer une réservation
1. Cliquez sur "Réservations" depuis le plan de salle
2. Cliquez sur "Nouvelle réservation"
3. Remplissez les informations:
   - Nom du client
   - Numéro de téléphone
   - Nombre de personnes
   - Date et heure
   - Table (optionnel)
   - Notes spéciales

### Gérer les réservations
- **Confirmer:** Marque la réservation comme confirmée
- **Placer:** Assigne les clients à leur table (change le statut en "Assis")
- **Annuler:** Annule la réservation
- **Terminer:** Marque la réservation comme complétée

### Statuts des réservations
- **En attente:** Nouvelle réservation
- **Confirmée:** Client a confirmé sa venue
- **Assis:** Clients installés à leur table
- **Annulée:** Réservation annulée
- **Terminée:** Service terminé

---

## Administration

### Accès
Seuls les utilisateurs avec le rôle "Manager" peuvent accéder à l'administration.

### Fonctionnalités disponibles

#### 1. Gestion des utilisateurs
- **Ajouter un utilisateur:**
  - Nom
  - Rôle (Serveur ou Manager)
  - Code PIN à 4 chiffres
- **Modifier un utilisateur:** Changer le nom, rôle ou PIN
- **Supprimer un utilisateur:** Retirer un compte
- **Voir les codes PIN:** Les codes PIN sont affichés en clair pour référence

#### 2. Gestion du menu
- **Recherche:** Barre de recherche pour trouver rapidement des plats
- **Ajouter un article:**
  - Nom du plat
  - Prix
  - Taux de TVA
  - Catégorie
  - Routage (Cuisine ou Bar)
- **Modifier un article:** Changer les informations d'un plat existant
- **Supprimer un article:** Retirer un plat du menu
- **Organisation:** Les plats sont groupés par catégorie

#### 3. Gestion des tables
- **Renommer une table:** Changer le numéro ou nom d'une table de façon permanente
- **Modifier la capacité:** Ajuster le nombre de couverts
- **Ajouter/Supprimer des tables:** Gérer le plan de salle

#### 4. Gestion des catégories
- **Créer une catégorie:** Ajouter une nouvelle catégorie de menu
- **Modifier une catégorie:** Changer le nom ou l'ordre
- **Supprimer une catégorie:** Retirer une catégorie (attention: les articles associés doivent être réassignés)

#### 5. Statistiques et rapports
- **Ventes du jour:** Chiffre d'affaires total
- **Performance par serveur:** Statistiques individuelles
- **Articles populaires:** Plats les plus commandés
- **Historique complet:** Accès à toutes les transactions

---

## Conseils et bonnes pratiques

### Pour les serveurs
1. **Vérifiez toujours** le statut de la table avant de prendre une commande
2. **Utilisez les notes** pour communiquer clairement avec la cuisine
3. **Marquez "À suivre"** les plats qui doivent être servis plus tard
4. **Vérifiez l'addition** avant de l'imprimer pour le client
5. **Utilisez les suppléments** pour les montants qui ne doivent pas apparaître sur le ticket

### Pour les managers
1. **Vérifiez régulièrement** les codes PIN des utilisateurs
2. **Mettez à jour le menu** selon les disponibilités
3. **Consultez les statistiques** pour optimiser le service
4. **Gérez les réservations** pour éviter les surréservations
5. **Formez le personnel** sur toutes les fonctionnalités

### Dépannage courant

#### Je ne peux pas me connecter
- Vérifiez que vous entrez le bon code PIN
- Contactez un administrateur si vous avez oublié votre PIN

#### La commande ne s'envoie pas
- Vérifiez que vous avez au moins un article dans le panier
- Assurez-vous d'avoir une connexion internet stable

#### L'addition ne s'affiche pas
- Vérifiez qu'il y a bien une commande pour cette table
- Rafraîchissez la page

#### Les articles payés ne se barrent pas
- Rafraîchissez la page
- Vérifiez que le paiement a bien été enregistré dans l'historique

---

## Support technique

Pour toute question ou problème technique, contactez votre administrateur système ou le support technique.

**Version de l'application:** 2.0  
**Dernière mise à jour:** Lundi 19 Janvier 2026 à 22:06
